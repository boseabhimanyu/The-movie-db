package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type MediaType string

const (
	MediaTypeMovie MediaType = "movie"
	MediaTypeShow  MediaType = "show"
)

type Review struct {
	ID             bson.ObjectID   `bson:"_id" json:"id"`
	UserID         bson.ObjectID   `bson:"userId" json:"userId"`
	MediaType      MediaType       `bson:"mediaType" json:"mediaType"`
	MediaID        bson.ObjectID   `bson:"mediaId" json:"mediaId"`
	Rating         int             `bson:"rating" json:"rating"` // 1 to 10
	Title          string          `bson:"title" json:"title"`
	Body           string          `bson:"body" json:"body"`
	IsSpoiler      bool            `bson:"isSpoiler" json:"isSpoiler"`
	HelpfulUserIDs []bson.ObjectID `bson:"helpfulUserIds" json:"-"`
	HelpfulCount   int             `bson:"helpfulCount" json:"helpfulCount"`
	CreatedAt      time.Time       `bson:"createdAt" json:"createdAt"`
	UpdatedAt      time.Time       `bson:"updatedAt" json:"updatedAt"`
}

type MediaRatingStats struct {
	MediaType     MediaType   `json:"mediaType"`
	MediaID       string      `json:"mediaId"`
	AverageRating float64     `json:"averageRating"`
	TotalRatings  int64       `json:"totalRatings"`
	TotalReviews  int64       `json:"totalReviews"`
	Distribution  map[int]int `json:"distribution"` // rating (1-10) -> count
}
