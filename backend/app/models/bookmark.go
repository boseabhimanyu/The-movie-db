package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type BookmarkMediaType string

const (
	BookmarkMediaTypeMovie BookmarkMediaType = "movie"
	BookmarkMediaTypeShow  BookmarkMediaType = "show"
)

type Bookmark struct {
	ID        bson.ObjectID     `bson:"_id,omitempty" json:"id"`
	UserID    bson.ObjectID     `bson:"user_id" json:"userId"`
	MediaType BookmarkMediaType `bson:"media_type" json:"mediaType"`
	MediaID   string            `bson:"media_id" json:"mediaId"`
	CreatedAt time.Time         `bson:"created_at" json:"createdAt"`
}
