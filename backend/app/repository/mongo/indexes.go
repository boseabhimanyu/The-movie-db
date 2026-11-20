package mongo

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	mongodriver "go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// User Indexes

func EnsureUserIndexes(
	ctx context.Context,
	db *mongodriver.Database,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	collection := db.Collection("users")

	// Drop the old non-partial unique_phone index if it already exists in MongoDB,
	// otherwise CreateMany will fail with IndexOptionsConflict.

	// if err := collection.Indexes().DropOne(ctx, "unique_phone"); err != nil {
	// 	var cmdErr mongodriver.CommandError
	// 	// Code 27 = IndexNotFound (safe to ignore on fresh databases)
	// 	if !errors.As(err, &cmdErr) || cmdErr.Code != 27 {
	// 		return err
	// 	}
	// }

	indexes := []mongodriver.IndexModel{
		{
			Keys: bson.D{
				{Key: "email", Value: 1},
			},
			Options: options.Index().
				SetUnique(true).
				SetName("unique_email"),
		},
		{
			Keys: bson.D{
				{Key: "username", Value: 1},
			},
			Options: options.Index().
				SetUnique(true).
				SetName("unique_username"),
		},
		{
			Keys: bson.D{
				{Key: "phone", Value: 1},
			},
			Options: options.Index().
				SetUnique(true).
				SetName("unique_phone").
				SetPartialFilterExpression(bson.D{
					{Key: "phone", Value: bson.D{
						{Key: "$type", Value: "string"},
						{Key: "$gt", Value: ""},
					}},
				}),
		},
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)

	return err
}

// Refresh Token index

func EnsureRefreshTokenIndexes(
	ctx context.Context,
	db *mongodriver.Database,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	collection := db.Collection("refresh_tokens")

	indexes := []mongodriver.IndexModel{
		{
			Keys: bson.D{
				{Key: "token_hash", Value: 1},
			},
			Options: options.Index().
				SetUnique(true).
				SetName("unique_token_hash"),
		},
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
			},
			Options: options.Index().
				SetName("refresh_token_user_id"),
		},
		{
			Keys: bson.D{
				{Key: "expires_at", Value: 1},
			},
			Options: options.Index().
				SetExpireAfterSeconds(0).
				SetName("refresh_token_expiry"),
		},
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)

	return err
}

// Page indexes

func EnsurePageIndexes(
	ctx context.Context,
	db *mongodriver.Database,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	collection := db.Collection("pages")

	indexes := []mongodriver.IndexModel{
		{
			Keys: bson.D{
				{Key: "slug", Value: 1},
			},
			Options: options.Index().
				SetUnique(true).
				SetName("unique_page_slug"),
		},
		{
			Keys: bson.D{
				{Key: "visibility", Value: 1},
				{Key: "created_at", Value: -1},
			},
			Options: options.Index().
				SetName("page_visibility_created_at"),
		},
		{
			Keys: bson.D{
				{Key: "author_id", Value: 1},
				{Key: "created_at", Value: -1},
			},
			Options: options.Index().
				SetName("page_author_created_at"),
		},
		{
			Keys: bson.D{
				{Key: "is_homepage", Value: 1},
			},
			Options: options.Index().
				SetUnique(true).
				SetPartialFilterExpression(
					bson.M{"is_homepage": true},
				),
		},
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)

	return err
}

// Movie indexes

func EnsureMovieIndexes(
	ctx context.Context,
	db *mongodriver.Database,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	collection := db.Collection("movies")

	indexes := []mongodriver.IndexModel{
		{
			Keys: bson.D{
				{Key: "ids.trakt", Value: 1},
			},
			Options: options.Index().
				SetUnique(true).
				SetName("unique_movie_trakt_id"),
		},
		{
			Keys: bson.D{
				{Key: "ids.slug", Value: 1},
			},
			Options: options.Index().
				SetUnique(true).
				SetSparse(true).
				SetName("unique_movie_slug"),
		},
		{
			Keys: bson.D{
				{Key: "title", Value: 1},
			},
			Options: options.Index().
				SetName("movie_title"),
		},
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)

	return err
}

// Show indexes

func EnsureShowIndexes(
	ctx context.Context,
	db *mongodriver.Database,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	collection := db.Collection("shows")

	indexes := []mongodriver.IndexModel{
		{
			Keys: bson.D{
				{Key: "ids.trakt", Value: 1},
			},
			Options: options.Index().
				SetUnique(true).
				SetName("unique_show_trakt_id"),
		},
		{
			Keys: bson.D{
				{Key: "ids.slug", Value: 1},
			},
			Options: options.Index().
				SetUnique(true).
				SetSparse(true).
				SetName("unique_show_slug"),
		},
		{
			Keys: bson.D{
				{Key: "title", Value: 1},
			},
			Options: options.Index().
				SetName("show_title"),
		},
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)

	return err
}

func EnsureReviewIndexes(ctx context.Context, db *mongo.Database) error {
	col := db.Collection("reviews")
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "userId", Value: 1},
				{Key: "mediaType", Value: 1},
				{Key: "mediaId", Value: 1},
			},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{
				{Key: "mediaType", Value: 1},
				{Key: "mediaId", Value: 1},
				{Key: "createdAt", Value: -1},
			},
		},
		{
			Keys: bson.D{
				{Key: "mediaType", Value: 1},
				{Key: "mediaId", Value: 1},
				{Key: "helpfulCount", Value: -1},
			},
		},
		{
			Keys: bson.D{
				{Key: "userId", Value: 1},
				{Key: "updatedAt", Value: -1},
			},
		},
	}

	_, err := col.Indexes().CreateMany(ctx, indexes)
	return err
}

// Moderation Word Indexes

func EnsureModerationWordIndexes(
	ctx context.Context,
	db *mongodriver.Database,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	collection := db.Collection("moderation_words")

	indexes := []mongodriver.IndexModel{
		{
			Keys: bson.D{
				{Key: "word", Value: 1},
				{Key: "type", Value: 1},
			},
			Options: options.Index().
				SetUnique(true).
				SetName("unique_word_type"),
		},
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)

	return err
}
