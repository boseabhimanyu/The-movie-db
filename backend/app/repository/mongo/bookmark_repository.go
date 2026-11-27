package mongo

import (
	"context"
	"errors"
	"time"

	"movie-app/models"
	"movie-app/repository"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const bookmarkCollection = "bookmarks"

type BookmarkRepository struct {
	collection *mongo.Collection
}

func NewBookmarkRepository(db *mongo.Database) repository.BookmarkRepository {
	return &BookmarkRepository{
		collection: db.Collection(bookmarkCollection),
	}
}

func (r *BookmarkRepository) Upsert(
	ctx context.Context,
	bookmark *models.Bookmark,
) (*models.Bookmark, error) {
	now := time.Now().UTC()
	if bookmark.CreatedAt.IsZero() {
		bookmark.CreatedAt = now
	}

	filter := bson.M{
		"user_id":    bookmark.UserID,
		"media_type": bookmark.MediaType,
		"media_id":   bookmark.MediaID,
	}

	update := bson.M{
		"$setOnInsert": bson.M{
			"_id":        bson.NewObjectID(),
			"user_id":    bookmark.UserID,
			"media_type": bookmark.MediaType,
			"media_id":   bookmark.MediaID,
			"created_at": bookmark.CreatedAt,
		},
	}

	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After)

	var saved models.Bookmark
	if err := r.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&saved); err != nil {
		return nil, err
	}

	return &saved, nil
}

func (r *BookmarkRepository) Delete(
	ctx context.Context,
	userID string,
	mediaType models.BookmarkMediaType,
	mediaID string,
) (bool, error) {
	userObjID, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return false, err
	}

	res, err := r.collection.DeleteOne(
		ctx,
		bson.M{
			"user_id":    userObjID,
			"media_type": mediaType,
			"media_id":   mediaID,
		},
	)
	if err != nil {
		return false, err
	}

	return res.DeletedCount > 0, nil
}

func (r *BookmarkRepository) IsBookmarked(
	ctx context.Context,
	userID string,
	mediaType models.BookmarkMediaType,
	mediaID string,
) (bool, error) {
	userObjID, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return false, err
	}

	err = r.collection.FindOne(
		ctx,
		bson.M{
			"user_id":    userObjID,
			"media_type": mediaType,
			"media_id":   mediaID,
		},
		options.FindOne().SetProjection(bson.M{"_id": 1}),
	).Err()

	if errors.Is(err, mongo.ErrNoDocuments) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

func (r *BookmarkRepository) List(
	ctx context.Context,
	filter repository.BookmarkListFilter,
) ([]*models.Bookmark, int64, error) {
	userObjID, err := bson.ObjectIDFromHex(filter.UserID)
	if err != nil {
		return nil, 0, err
	}

	query := bson.M{
		"user_id": userObjID,
	}

	if filter.MediaType != nil {
		query["media_type"] = *filter.MediaType
	}

	total, err := r.collection.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []*models.Bookmark{}, 0, nil
	}

	cursor, err := r.collection.Find(
		ctx,
		query,
		options.Find().
			SetSkip(filter.Skip).
			SetLimit(filter.Limit).
			SetSort(bson.D{
				{Key: "created_at", Value: -1},
			}),
	)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var bookmarks []*models.Bookmark
	if err := cursor.All(ctx, &bookmarks); err != nil {
		return nil, 0, err
	}

	return bookmarks, total, nil
}
