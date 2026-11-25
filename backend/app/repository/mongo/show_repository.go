package mongo

import (
	"context"
	"errors"
	"movie-app/apperrors"
	"movie-app/models"
	"movie-app/repository"
	"regexp"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type ShowRepository struct {
	collection *mongo.Collection
}

func NewShowRepository(db *mongo.Database) *ShowRepository {
	return &ShowRepository{
		collection: db.Collection("shows"),
	}
}

func (r *ShowRepository) UpsertByTraktID(
	ctx context.Context,
	show *models.Show,
) (*models.Show, error) {
	ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
	defer cancel()

	now := time.Now().UTC()
	show.SyncedAt = now
	show.UpdatedAt = now

	if show.Genres == nil {
		show.Genres = []string{}
	}
	if show.Artwork.Posters == nil {
		show.Artwork.Posters = []string{}
	}
	if show.Artwork.Backdrops == nil {
		show.Artwork.Backdrops = []string{}
	}
	if show.Seasons == nil {
		show.Seasons = []models.ShowSeason{}
	}
	if show.Credits.Cast == nil {
		show.Credits.Cast = []models.CastMember{}
	}
	if show.Credits.Directors == nil {
		show.Credits.Directors = []models.CrewMember{}
	}
	if show.Credits.Writers == nil {
		show.Credits.Writers = []models.CrewMember{}
	}

	filter := bson.M{
		"ids.trakt": show.IDs.Trakt,
	}

	setFields := bson.M{
		"title":          show.Title,
		"year":           show.Year,
		"ids":            show.IDs,
		"tagline":        show.Tagline,
		"overview":       show.Overview,
		"first_aired":    show.FirstAired,
		"airs":           show.Airs,
		"runtime":        show.Runtime,
		"certification":  show.Certification,
		"network":        show.Network,
		"country":        show.Country,
		"trailer":        show.Trailer,
		"homepage":       show.Homepage,
		"status":         show.Status,
		"rating":         show.Rating,
		"votes":          show.Votes,
		"language":       show.Language,
		"genres":         show.Genres,
		"aired_episodes": show.AiredEpisodes,
		"artwork":        show.Artwork,
		"synced_at":      show.SyncedAt,
		"updated_at":     show.UpdatedAt,
	}

	// Preserve cached seasons/credits when upserting lightweight feed items
	if len(show.Seasons) > 0 {
		setFields["seasons"] = show.Seasons
	}
	if len(show.Credits.Cast) > 0 ||
		len(show.Credits.Directors) > 0 ||
		len(show.Credits.Writers) > 0 {
		setFields["credits"] = show.Credits
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

	var saved models.Show
	err := r.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&saved)
	if err != nil {
		return nil, err
	}

	return &saved, nil
}

func (r *ShowRepository) FindByTraktID(
	ctx context.Context,
	traktID int,
) (*models.Show, error) {
	ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
	defer cancel()

	var show models.Show
	err := r.collection.FindOne(ctx, bson.M{"ids.trakt": traktID}).Decode(&show)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperrors.ErrMediaNotFound
		}
		return nil, err
	}

	return &show, nil
}

func (r *ShowRepository) FindBySlug(
	ctx context.Context,
	slug string,
) (*models.Show, error) {
	ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
	defer cancel()

	var show models.Show
	err := r.collection.FindOne(
		ctx,
		bson.M{"ids.slug": strings.ToLower(strings.TrimSpace(slug))},
	).Decode(&show)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperrors.ErrMediaNotFound
		}
		return nil, err
	}

	return &show, nil
}

func (r *ShowRepository) FindByIDOrSlug(
	ctx context.Context,
	idOrSlug string,
) (*models.Show, error) {
	val := strings.TrimSpace(idOrSlug)
	if val == "" {
		return nil, apperrors.ErrMediaNotFound
	}

	if traktID, err := strconv.Atoi(val); err == nil && traktID > 0 {
		return r.FindByTraktID(ctx, traktID)
	}

	if objID, err := bson.ObjectIDFromHex(val); err == nil {
		ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
		defer cancel()

		var show models.Show
		err := r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&show)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				return nil, apperrors.ErrMediaNotFound
			}
			return nil, err
		}
		return &show, nil
	}

	return r.FindBySlug(ctx, val)
}

func (r *ShowRepository) SearchLocal(
	ctx context.Context,
	query string,
	page, limit int,
	filters repository.MediaSearchFilters,
) ([]models.Show, int64, error) {
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
	repository.ApplyMongoMediaFilters(filter, filters)

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

	shows := make([]models.Show, 0)
	if err := cursor.All(ctx, &shows); err != nil {
		return nil, 0, err
	}

	return shows, total, nil
}
