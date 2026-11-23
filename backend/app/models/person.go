package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type PersonIDs struct {
	Trakt int    `bson:"trakt" json:"trakt"`
	Slug  string `bson:"slug" json:"slug"`
	IMDB  string `bson:"imdb,omitempty" json:"imdb,omitempty"`
}

type PersonSocialIDs struct {
	Twitter   string `bson:"twitter,omitempty" json:"twitter,omitempty"`
	Facebook  string `bson:"facebook,omitempty" json:"facebook,omitempty"`
	Instagram string `bson:"instagram,omitempty" json:"instagram,omitempty"`
	Wikipedia string `bson:"wikipedia,omitempty" json:"wikipedia,omitempty"`
}

type PersonImages struct {
	Headshot string `bson:"headshot,omitempty" json:"headshot,omitempty"`
	Fanart   string `bson:"fanart,omitempty" json:"fanart,omitempty"`
}

type PersonMovieCredit struct {
	Role     string    `bson:"role,omitempty" json:"role,omitempty"`
	Jobs     []string  `bson:"jobs,omitempty" json:"jobs,omitempty"`
	Title    string    `bson:"title" json:"title"`
	Year     int       `bson:"year" json:"year"`
	Rating   float64   `bson:"rating" json:"rating"`
	Votes    int       `bson:"votes" json:"votes"`
	Overview string    `bson:"overview,omitempty" json:"overview,omitempty"`
	Genres   []string  `bson:"genres,omitempty" json:"genres,omitempty"`
	Poster   string    `bson:"poster,omitempty" json:"poster,omitempty"`
	IDs      PersonIDs `bson:"ids" json:"ids"`
}

type PersonShowCredit struct {
	Role         string    `bson:"role,omitempty" json:"role,omitempty"`
	Jobs         []string  `bson:"jobs,omitempty" json:"jobs,omitempty"`
	EpisodeCount int       `bson:"episode_count,omitempty" json:"episodeCount,omitempty"`
	Title        string    `bson:"title" json:"title"`
	Year         int       `bson:"year" json:"year"`
	Rating       float64   `bson:"rating" json:"rating"`
	Votes        int       `bson:"votes" json:"votes"`
	Status       string    `bson:"status,omitempty" json:"status,omitempty"`
	Genres       []string  `bson:"genres,omitempty" json:"genres,omitempty"`
	Poster       string    `bson:"poster,omitempty" json:"poster,omitempty"`
	IDs          PersonIDs `bson:"ids" json:"ids"`
}

type PersonMovieCredits struct {
	Acting      []PersonMovieCredit            `bson:"acting" json:"acting"`
	Departments map[string][]PersonMovieCredit `bson:"departments" json:"departments"`
}

type PersonShowCredits struct {
	Acting      []PersonShowCredit            `bson:"acting" json:"acting"`
	Departments map[string][]PersonShowCredit `bson:"departments" json:"departments"`
}

type Person struct {
	ID                  bson.ObjectID      `bson:"_id,omitempty" json:"id"`
	Name                string             `bson:"name" json:"name"`
	IDs                 PersonIDs          `bson:"ids" json:"ids"`
	Biography           string             `bson:"biography" json:"biography"`
	Birthday            string             `bson:"birthday,omitempty" json:"birthday,omitempty"`
	Death               string             `bson:"death,omitempty" json:"death,omitempty"`
	Birthplace          string             `bson:"birthplace,omitempty" json:"birthplace,omitempty"`
	Homepage            string             `bson:"homepage,omitempty" json:"homepage,omitempty"`
	SocialIDs           PersonSocialIDs    `bson:"social_ids" json:"socialIds"`
	Images              PersonImages       `bson:"images" json:"images"`
	KnownForDepartments []string           `bson:"known_for_departments" json:"knownForDepartments"`
	MovieCredits        PersonMovieCredits `bson:"movie_credits" json:"movieCredits"`
	ShowCredits         PersonShowCredits  `bson:"show_credits" json:"showCredits"`
	SyncedAt            time.Time          `bson:"synced_at" json:"syncedAt"`
	CreatedAt           time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt           time.Time          `bson:"updated_at" json:"updatedAt"`
}
