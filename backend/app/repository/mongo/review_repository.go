package mongo

import (
	"context"
	"movie-app/apperrors"
	"movie-app/models"
	"movie-app/repository"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type reviewRepository struct {
	col *mongo.Collection
}

func NewReviewRepository(db *mongo.Database) repository.ReviewRepository {
	return &reviewRepository{
		col: db.Collection("reviews"),
	}
}

func (r *reviewRepository) Create(
	ctx context.Context,
	userID string,
	mediaType models.MediaType,
	mediaID string,
	review *models.Review,
) (*models.Review, error) {
	uid, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	mid, err := bson.ObjectIDFromHex(mediaID)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	doc := &models.Review{
		ID:             bson.NewObjectID(),
		UserID:         uid,
		MediaType:      mediaType,
		MediaID:        mid,
		Rating:         review.Rating,
		Title:          review.Title,
		Body:           review.Body,
		IsSpoiler:      review.IsSpoiler,
		HelpfulUserIDs: []bson.ObjectID{},
		HelpfulCount:   0,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, apperrors.ErrReviewAlreadyExists
		}
		return nil, err
	}

	return doc, nil
}

func (r *reviewRepository) Update(ctx context.Context, review *models.Review) (*models.Review, error) {
	review.UpdatedAt = time.Now().UTC()

	update := bson.M{
		"$set": bson.M{
			"rating":    review.Rating,
			"title":     review.Title,
			"body":      review.Body,
			"isSpoiler": review.IsSpoiler,
			"updatedAt": review.UpdatedAt,
		},
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updated models.Review
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": review.ID}, update, opts).Decode(&updated); err != nil {
		return nil, err
	}

	return &updated, nil
}
func (r *reviewRepository) FindByID(ctx context.Context, id string) (*models.Review, error) {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, mongo.ErrNoDocuments
	}

	var review models.Review
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&review); err != nil {
		return nil, err
	}
	return &review, nil
}

func (r *reviewRepository) FindByUserAndMedia(
	ctx context.Context,
	userID string,
	mediaType models.MediaType,
	mediaID string,
) (*models.Review, error) {
	uid, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, mongo.ErrNoDocuments
	}
	mid, err := bson.ObjectIDFromHex(mediaID)
	if err != nil {
		return nil, mongo.ErrNoDocuments
	}

	var review models.Review
	err = r.col.FindOne(ctx, bson.M{
		"userId":    uid,
		"mediaType": mediaType,
		"mediaId":   mid,
	}).Decode(&review)
	if err != nil {
		return nil, err
	}
	return &review, nil
}

func (r *reviewRepository) ListByMedia(
	ctx context.Context,
	mediaType models.MediaType,
	mediaID string,
	sort repository.ReviewSort,
	onlyWritten bool,
	page, limit int,
) ([]models.Review, int64, error) {
	mid, err := bson.ObjectIDFromHex(mediaID)
	if err != nil {
		return []models.Review{}, 0, nil
	}

	filter := bson.M{
		"mediaType": mediaType,
		"mediaId":   mid,
	}
	if onlyWritten {
		filter["body"] = bson.M{"$ne": ""}
	}

	total, err := r.col.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	var sortDoc bson.D
	switch sort {
	case repository.ReviewSortHelpful:
		sortDoc = bson.D{{Key: "helpfulCount", Value: -1}, {Key: "createdAt", Value: -1}}
	case repository.ReviewSortHighest:
		sortDoc = bson.D{{Key: "rating", Value: -1}, {Key: "createdAt", Value: -1}}
	case repository.ReviewSortLowest:
		sortDoc = bson.D{{Key: "rating", Value: 1}, {Key: "createdAt", Value: -1}}
	default:
		sortDoc = bson.D{{Key: "createdAt", Value: -1}}
	}

	skip := int64((page - 1) * limit)
	opts := options.Find().
		SetSort(sortDoc).
		SetSkip(skip).
		SetLimit(int64(limit))

	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var reviews []models.Review
	if err := cursor.All(ctx, &reviews); err != nil {
		return nil, 0, err
	}
	if reviews == nil {
		reviews = []models.Review{}
	}

	return reviews, total, nil
}

func (r *reviewRepository) ListByUser(
	ctx context.Context,
	userID string,
	mediaType models.MediaType,
	page, limit int,
) ([]models.Review, int64, error) {
	uid, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return []models.Review{}, 0, nil
	}

	filter := bson.M{"userId": uid}
	if mediaType == models.MediaTypeMovie || mediaType == models.MediaTypeShow {
		filter["mediaType"] = mediaType
	}

	total, err := r.col.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	skip := int64((page - 1) * limit)
	opts := options.Find().
		SetSort(bson.D{{Key: "updatedAt", Value: -1}}).
		SetSkip(skip).
		SetLimit(int64(limit))

	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var reviews []models.Review
	if err := cursor.All(ctx, &reviews); err != nil {
		return nil, 0, err
	}
	if reviews == nil {
		reviews = []models.Review{}
	}

	return reviews, total, nil
}

func (r *reviewRepository) GetMediaStats(
	ctx context.Context,
	mediaType models.MediaType,
	mediaID string,
) (models.MediaRatingStats, error) {
	stats := models.MediaRatingStats{
		MediaType:    mediaType,
		MediaID:      mediaID,
		Distribution: make(map[int]int),
	}

	mid, err := bson.ObjectIDFromHex(mediaID)
	if err != nil {
		return stats, nil
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"mediaType": mediaType,
			"mediaId":   mid,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":          "$rating",
			"count":        bson.M{"$sum": 1},
			"writtenCount": bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$ne": bson.A{"$body", ""}}, 1, 0}}},
		}}},
	}

	cursor, err := r.col.Aggregate(ctx, pipeline)
	if err != nil {
		return stats, err
	}
	defer cursor.Close(ctx)

	type bucket struct {
		Rating       int   `bson:"_id"`
		Count        int64 `bson:"count"`
		WrittenCount int64 `bson:"writtenCount"`
	}

	var buckets []bucket
	if err := cursor.All(ctx, &buckets); err != nil {
		return stats, err
	}

	var weightedSum int64
	for _, b := range buckets {
		stats.Distribution[b.Rating] = int(b.Count)
		stats.TotalRatings += b.Count
		stats.TotalReviews += b.WrittenCount
		weightedSum += int64(b.Rating) * b.Count
	}

	if stats.TotalRatings > 0 {
		avg := float64(weightedSum) / float64(stats.TotalRatings)
		stats.AverageRating = float64(int(avg*10+0.5)) / 10
	}

	return stats, nil
}

func (r *reviewRepository) ToggleHelpful(
	ctx context.Context,
	reviewID, userID string,
) (*models.Review, bool, error) {
	rid, err := bson.ObjectIDFromHex(reviewID)
	if err != nil {
		return nil, false, mongo.ErrNoDocuments
	}
	uid, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, false, err
	}

	var existing models.Review
	if err := r.col.FindOne(ctx, bson.M{"_id": rid}).Decode(&existing); err != nil {
		return nil, false, err
	}

	alreadyHelpful := false
	for _, id := range existing.HelpfulUserIDs {
		if id == uid {
			alreadyHelpful = true
			break
		}
	}

	var update bson.M
	added := !alreadyHelpful
	if alreadyHelpful {
		update = bson.M{
			"$pull": bson.M{"helpfulUserIds": uid},
			"$inc":  bson.M{"helpfulCount": -1},
		}
	} else {
		update = bson.M{
			"$addToSet": bson.M{"helpfulUserIds": uid},
			"$inc":      bson.M{"helpfulCount": 1},
		}
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updated models.Review
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": rid}, update, opts).Decode(&updated); err != nil {
		return nil, false, err
	}

	return &updated, added, nil
}

func (r *reviewRepository) DeleteByID(ctx context.Context, reviewID string) error {
	rid, err := bson.ObjectIDFromHex(reviewID)
	if err != nil {
		return mongo.ErrNoDocuments
	}

	res, err := r.col.DeleteOne(ctx, bson.M{"_id": rid})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return mongo.ErrNoDocuments
	}
	return nil
}
