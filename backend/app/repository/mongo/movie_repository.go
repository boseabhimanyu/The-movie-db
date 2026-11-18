package mongo

import (
	"context"
	"errors"
	"movie-app/models"
	"regexp"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var ErrMediaNotFound = errors.New("media not found")

type MovieRepository struct {
	collection *mongo.Collection
}

func NewMovieRepository(db *mongo.Database) *MovieRepository {
	return &MovieRepository{
		collection: db.Collection("movies"),
	}
}

func (r *MovieRepository) UpsertByTraktID(
	ctx context.Context,
	movie *models.Movie,
) (*models.Movie, error) {
	ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
	defer cancel()

	now := time.Now().UTC()
	movie.SyncedAt = now
	movie.UpdatedAt = now

	if movie.Genres == nil {
		movie.Genres = []string{}
	}
	if movie.Artwork.Posters == nil {
		movie.Artwork.Posters = []string{}
	}
	if movie.Artwork.Backdrops == nil {
		movie.Artwork.Backdrops = []string{}
	}
	if movie.Credits.Cast == nil {
		movie.Credits.Cast = []models.CastMember{}
	}
	if movie.Credits.Directors == nil {
		movie.Credits.Directors = []models.CrewMember{}
	}
	if movie.Credits.Writers == nil {
		movie.Credits.Writers = []models.CrewMember{}
	}

	filter := bson.M{
		"ids.trakt": movie.IDs.Trakt,
	}

	setFields := bson.M{
		"title":         movie.Title,
		"year":          movie.Year,
		"ids":           movie.IDs,
		"tagline":       movie.Tagline,
		"overview":      movie.Overview,
		"released":      movie.Released,
		"runtime":       movie.Runtime,
		"country":       movie.Country,
		"trailer":       movie.Trailer,
		"homepage":      movie.Homepage,
		"status":        movie.Status,
		"rating":        movie.Rating,
		"votes":         movie.Votes,
		"language":      movie.Language,
		"genres":        movie.Genres,
		"certification": movie.Certification,
		"artwork":       movie.Artwork,
		"synced_at":     movie.SyncedAt,
		"updated_at":    movie.UpdatedAt,
	}

	// Only overwrite credits when populated so feed syncs don't wipe cached cast/crew
	if len(movie.Credits.Cast) > 0 ||
		len(movie.Credits.Directors) > 0 ||
		len(movie.Credits.Writers) > 0 {
		setFields["credits"] = movie.Credits
	}

	update := bson.M{
		"$set": setFields,
		"$setOnInsert": bson.M{
			"_id":        bson.NewObjectID(),
			"created_at": now,
		},
	}

	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After)

	var saved models.Movie
	err := r.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&saved)
	if err != nil {
		return nil, err
	}

	return &saved, nil
}

func (r *MovieRepository) FindByTraktID(
	ctx context.Context,
	traktID int,
) (*models.Movie, error) {
	ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
	defer cancel()

	var movie models.Movie
	err := r.collection.FindOne(ctx, bson.M{"ids.trakt": traktID}).Decode(&movie)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrMediaNotFound
		}
		return nil, err
	}

	return &movie, nil
}

func (r *MovieRepository) FindBySlug(
	ctx context.Context,
	slug string,
) (*models.Movie, error) {
	ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
	defer cancel()

	var movie models.Movie
	err := r.collection.FindOne(
		ctx,
		bson.M{"ids.slug": strings.ToLower(strings.TrimSpace(slug))},
	).Decode(&movie)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrMediaNotFound
		}
		return nil, err
	}

	return &movie, nil
}

func (r *MovieRepository) FindByIDOrSlug(
	ctx context.Context,
	idOrSlug string,
) (*models.Movie, error) {
	val := strings.TrimSpace(idOrSlug)
	if val == "" {
		return nil, ErrMediaNotFound
	}

	if traktID, err := strconv.Atoi(val); err == nil && traktID > 0 {
		return r.FindByTraktID(ctx, traktID)
	}

	if objID, err := bson.ObjectIDFromHex(val); err == nil {
		ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
		defer cancel()

		var movie models.Movie
		err := r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&movie)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				return nil, ErrMediaNotFound
			}
			return nil, err
		}
		return &movie, nil
	}

	return r.FindBySlug(ctx, val)
}

func (r *MovieRepository) SearchLocal(
	ctx context.Context,
	query string,
	page, limit int,
) ([]models.Movie, int64, error) {
	ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
	defer cancel()

	q := strings.TrimSpace(query)
	filter := bson.M{}
	if q != "" {
		filter["title"] = bson.M{
			"$regex":   regexp.QuoteMeta(q),
			"$options": "i",
		}
	}

	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	skip := int64((page - 1) * limit)
	opts := options.Find().
		SetSort(bson.D{{Key: "votes", Value: -1}}).
		SetSkip(skip).
		SetLimit(int64(limit))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	movies := make([]models.Movie, 0)
	if err := cursor.All(ctx, &movies); err != nil {
		return nil, 0, err
	}

	return movies, total, nil
}
