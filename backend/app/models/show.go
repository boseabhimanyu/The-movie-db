package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type ShowAirTime struct {
	Day      string `bson:"day" json:"day"`
	Time     string `bson:"time" json:"time"`
	Timezone string `bson:"timezone" json:"timezone"`
}

type ShowEpisodeSummary struct {
	Number     int         `bson:"number" json:"number"`
	Title      string      `bson:"title" json:"title"`
	Overview   string      `bson:"overview" json:"overview"`
	FirstAired string      `bson:"first_aired" json:"firstAired"`
	Runtime    int         `bson:"runtime" json:"runtime"`
	Rating     float64     `bson:"rating" json:"rating"`
	Votes      int         `bson:"votes" json:"votes"`
	IDs        ExternalIDs `bson:"ids" json:"ids"`
}

type ShowSeason struct {
	Number        int                  `bson:"number" json:"number"`
	Title         string               `bson:"title" json:"title"`
	Overview      string               `bson:"overview" json:"overview"`
	EpisodeCount  int                  `bson:"episode_count" json:"episodeCount"`
	AiredEpisodes int                  `bson:"aired_episodes" json:"airedEpisodes"`
	Rating        float64              `bson:"rating" json:"rating"`
	FirstAired    string               `bson:"first_aired" json:"firstAired"`
	Network       string               `bson:"network" json:"network"`
	Poster        string               `bson:"poster" json:"poster"`
	IDs           ExternalIDs          `bson:"ids" json:"ids"`
	Episodes      []ShowEpisodeSummary `bson:"episodes" json:"episodes"`
}

type Show struct {
	ID bson.ObjectID `bson:"_id" json:"id"`

	Title         string      `bson:"title" json:"title"`
	Year          int         `bson:"year" json:"year"`
	IDs           ExternalIDs `bson:"ids" json:"ids"`
	Tagline       string      `bson:"tagline" json:"tagline"`
	Overview      string      `bson:"overview" json:"overview"`
	FirstAired    string      `bson:"first_aired" json:"firstAired"`
	Airs          ShowAirTime `bson:"airs" json:"airs"`
	Runtime       int         `bson:"runtime" json:"runtime"`
	Certification string      `bson:"certification" json:"certification"`
	Network       string      `bson:"network" json:"network"`
	Country       string      `bson:"country" json:"country"`
	Trailer       string      `bson:"trailer" json:"trailer"`
	Homepage      string      `bson:"homepage" json:"homepage"`
	Status        string      `bson:"status" json:"status"`
	Rating        float64     `bson:"rating" json:"rating"`
	Votes         int         `bson:"votes" json:"votes"`
	Language      string      `bson:"language" json:"language"`
	Genres        []string    `bson:"genres" json:"genres"`
	AiredEpisodes int         `bson:"aired_episodes" json:"airedEpisodes"`

	Seasons []ShowSeason `bson:"seasons" json:"seasons"`
	Artwork MediaArtwork `bson:"artwork" json:"artwork"`
	Credits MediaCredits `bson:"credits" json:"credits"`

	SyncedAt  time.Time `bson:"synced_at" json:"syncedAt"`
	CreatedAt time.Time `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time `bson:"updated_at" json:"updatedAt"`
}
