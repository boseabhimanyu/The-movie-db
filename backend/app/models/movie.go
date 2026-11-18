package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Movie struct {
	ID bson.ObjectID `bson:"_id" json:"id"`

	Title         string      `bson:"title" json:"title"`
	Year          int         `bson:"year" json:"year"`
	IDs           ExternalIDs `bson:"ids" json:"ids"`
	Tagline       string      `bson:"tagline" json:"tagline"`
	Overview      string      `bson:"overview" json:"overview"`
	Released      string      `bson:"released" json:"released"`
	Runtime       int         `bson:"runtime" json:"runtime"`
	Country       string      `bson:"country" json:"country"`
	Trailer       string      `bson:"trailer" json:"trailer"`
	Homepage      string      `bson:"homepage" json:"homepage"`
	Status        string      `bson:"status" json:"status"`
	Rating        float64     `bson:"rating" json:"rating"`
	Votes         int         `bson:"votes" json:"votes"`
	Language      string      `bson:"language" json:"language"`
	Genres        []string    `bson:"genres" json:"genres"`
	Certification string      `bson:"certification" json:"certification"`

	Artwork MediaArtwork `bson:"artwork" json:"artwork"`
	Credits MediaCredits `bson:"credits" json:"credits"`

	SyncedAt  time.Time `bson:"synced_at" json:"syncedAt"`
	CreatedAt time.Time `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time `bson:"updated_at" json:"updatedAt"`
}
