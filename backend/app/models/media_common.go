package models

type ExternalIDs struct {
	Trakt int    `bson:"trakt" json:"trakt"`
	Slug  string `bson:"slug" json:"slug"`
	IMDB  string `bson:"imdb" json:"imdb"`
	TMDB  int    `bson:"tmdb" json:"tmdb"`
	TVDB  int    `bson:"tvdb" json:"tvdb"`
}

type MediaArtwork struct {
	Poster    string   `bson:"poster" json:"poster"`
	Backdrop  string   `bson:"backdrop" json:"backdrop"`
	Logo      string   `bson:"logo" json:"logo"`
	Banner    string   `bson:"banner" json:"banner"`
	Thumb     string   `bson:"thumb" json:"thumb"`
	Posters   []string `bson:"posters" json:"posters"`
	Backdrops []string `bson:"backdrops" json:"backdrops"`
}

type CastMember struct {
	TraktID    int         `bson:"trakt_id" json:"traktId"`
	Name       string      `bson:"name" json:"name"`
	Slug       string      `bson:"slug" json:"slug"`
	Headshot   string      `bson:"headshot,omitempty" json:"headshot,omitempty"`
	Characters []string    `bson:"characters" json:"characters"`
	IDs        ExternalIDs `bson:"ids" json:"ids"`
}

type CrewMember struct {
	TraktID  int         `bson:"trakt_id" json:"traktId"`
	Name     string      `bson:"name" json:"name"`
	Slug     string      `bson:"slug" json:"slug"`
	Headshot string      `bson:"headshot,omitempty" json:"headshot,omitempty"`
	Jobs     []string    `bson:"jobs" json:"jobs"`
	IDs      ExternalIDs `bson:"ids" json:"ids"`
}

type MediaCredits struct {
	Cast      []CastMember `bson:"cast" json:"cast"`
	Directors []CrewMember `bson:"directors" json:"directors"`
	Writers   []CrewMember `bson:"writers" json:"writers"`
}
