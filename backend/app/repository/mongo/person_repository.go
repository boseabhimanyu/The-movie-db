package mongo

import (
	"context"
	"errors"
	"movie-app/apperrors"
	"movie-app/models"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type PersonRepository struct {
	collection       *mongo.Collection
	moviesCollection *mongo.Collection
	showsCollection  *mongo.Collection
}

func NewPersonRepository(db *mongo.Database) *PersonRepository {
	return &PersonRepository{
		collection:       db.Collection("people"),
		moviesCollection: db.Collection("movies"),
		showsCollection:  db.Collection("shows"),
	}
}

func (r *PersonRepository) UpsertByTraktID(
	ctx context.Context,
	person *models.Person,
) (*models.Person, error) {
	ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
	defer cancel()

	now := time.Now().UTC()
	person.SyncedAt = now
	person.UpdatedAt = now
	person.IDs.Slug = strings.ToLower(strings.TrimSpace(person.IDs.Slug))

	if person.KnownForDepartments == nil {
		person.KnownForDepartments = []string{}
	}
	if person.MovieCredits.Acting == nil {
		person.MovieCredits.Acting = []models.PersonMovieCredit{}
	}
	if person.MovieCredits.Departments == nil {
		person.MovieCredits.Departments = make(map[string][]models.PersonMovieCredit)
	}
	if person.ShowCredits.Acting == nil {
		person.ShowCredits.Acting = []models.PersonShowCredit{}
	}
	if person.ShowCredits.Departments == nil {
		person.ShowCredits.Departments = make(map[string][]models.PersonShowCredit)
	}

	filter := bson.M{
		"ids.trakt": person.IDs.Trakt,
	}

	setFields := bson.M{
		"name":                  person.Name,
		"ids":                   person.IDs,
		"biography":             person.Biography,
		"birthday":              person.Birthday,
		"death":                 person.Death,
		"birthplace":            person.Birthplace,
		"homepage":              person.Homepage,
		"social_ids":            person.SocialIDs,
		"images":                person.Images,
		"known_for_departments": person.KnownForDepartments,
		"movie_credits":         person.MovieCredits,
		"show_credits":          person.ShowCredits,
		"synced_at":             person.SyncedAt,
		"updated_at":            person.UpdatedAt,
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

	var saved models.Person
	err := r.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&saved)
	if err != nil {
		return nil, err
	}

	return &saved, nil
}

func (r *PersonRepository) FindByTraktID(
	ctx context.Context,
	traktID int,
) (*models.Person, error) {
	ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
	defer cancel()

	var person models.Person
	err := r.collection.FindOne(ctx, bson.M{"ids.trakt": traktID}).Decode(&person)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperrors.ErrMediaNotFound
		}
		return nil, err
	}

	return &person, nil
}

func (r *PersonRepository) FindBySlug(
	ctx context.Context,
	slug string,
) (*models.Person, error) {
	ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
	defer cancel()

	var person models.Person
	err := r.collection.FindOne(
		ctx,
		bson.M{"ids.slug": strings.ToLower(strings.TrimSpace(slug))},
	).Decode(&person)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperrors.ErrMediaNotFound
		}
		return nil, err
	}

	return &person, nil
}

func (r *PersonRepository) FindByIDOrSlug(
	ctx context.Context,
	idOrSlug string,
) (*models.Person, error) {
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

		var person models.Person
		err := r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&person)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				return nil, apperrors.ErrMediaNotFound
			}
			return nil, err
		}
		return &person, nil
	}

	return r.FindBySlug(ctx, val)
}

type localArtworkProjection struct {
	IDs struct {
		Trakt int `bson:"trakt"`
	} `bson:"ids"`
	Artwork struct {
		Posters []string `bson:"posters"`
	} `bson:"artwork"`
}

func (r *PersonRepository) FindLocalMoviePostersByTraktIDs(
	ctx context.Context,
	traktIDs []int,
) (map[int]string, error) {
	return r.findLocalPosters(ctx, r.moviesCollection, traktIDs)
}

func (r *PersonRepository) FindLocalShowPostersByTraktIDs(
	ctx context.Context,
	traktIDs []int,
) (map[int]string, error) {
	return r.findLocalPosters(ctx, r.showsCollection, traktIDs)
}

func (r *PersonRepository) findLocalPosters(
	ctx context.Context,
	col *mongo.Collection,
	traktIDs []int,
) (map[int]string, error) {
	out := make(map[int]string)
	if len(traktIDs) == 0 {
		return out, nil
	}

	ctx, cancel := context.WithTimeout(ctx, databaseTimeout)
	defer cancel()

	filter := bson.M{
		"ids.trakt": bson.M{"$in": traktIDs},
	}
	opts := options.Find().SetProjection(bson.M{
		"ids.trakt":       1,
		"artwork.posters": 1,
	})

	cursor, err := col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var docs []localArtworkProjection
	if err := cursor.All(ctx, &docs); err != nil {
		return nil, err
	}

	for _, d := range docs {
		if d.IDs.Trakt > 0 && len(d.Artwork.Posters) > 0 && strings.TrimSpace(d.Artwork.Posters[0]) != "" {
			out[d.IDs.Trakt] = strings.TrimSpace(d.Artwork.Posters[0])
		}
	}

	return out, nil
}
