package mongo

import (
	"context"
	"errors"
	"time"

	"movie-app/apperrors"
	"movie-app/models"
	"movie-app/repository"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const emailVerificationCollection = "email_verification_tokens"

type EmailVerificationRepository struct {
	collection *mongo.Collection
}

func NewEmailVerificationRepository(
	db *mongo.Database,
) repository.EmailVerificationRepository {
	return &EmailVerificationRepository{
		collection: db.Collection(emailVerificationCollection),
	}
}

func (r *EmailVerificationRepository) Create(
	ctx context.Context,
	token *models.EmailVerificationToken,
) error {
	if token.ID.IsZero() {
		token.ID = bson.NewObjectID()
	}
	if token.CreatedAt.IsZero() {
		token.CreatedAt = time.Now().UTC()
	}

	_, err := r.collection.InsertOne(ctx, token)
	return err
}

func (r *EmailVerificationRepository) FindValidByTokenHash(
	ctx context.Context,
	tokenHash string,
) (*models.EmailVerificationToken, error) {
	var token models.EmailVerificationToken

	err := r.collection.FindOne(
		ctx,
		bson.M{
			"token_hash": tokenHash,
			"expires_at": bson.M{"$gt": time.Now().UTC()},
		},
	).Decode(&token)

	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperrors.ErrInvalidEmailVerificationToken
		}
		return nil, err
	}

	return &token, nil
}

func (r *EmailVerificationRepository) FindLatestByUserID(
	ctx context.Context,
	userID string,
) (*models.EmailVerificationToken, error) {
	objectID, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, apperrors.ErrInvalidUserID
	}

	var token models.EmailVerificationToken
	opts := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})

	err = r.collection.FindOne(
		ctx,
		bson.M{"user_id": objectID},
		opts,
	).Decode(&token)

	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperrors.ErrInvalidEmailVerificationToken
		}
		return nil, err
	}

	return &token, nil
}

func (r *EmailVerificationRepository) DeleteByUserID(
	ctx context.Context,
	userID string,
) error {
	objectID, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return apperrors.ErrInvalidUserID
	}

	_, err = r.collection.DeleteMany(ctx, bson.M{"user_id": objectID})
	return err
}
