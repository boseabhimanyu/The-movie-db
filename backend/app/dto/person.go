package dto

type PersonIDsResponse struct {
	Trakt int    `json:"trakt"`
	Slug  string `json:"slug"`
	IMDB  string `json:"imdb,omitempty"`
}

type PersonSocialResponse struct {
	Twitter   string `json:"twitter,omitempty"`
	Facebook  string `json:"facebook,omitempty"`
	Instagram string `json:"instagram,omitempty"`
	Wikipedia string `json:"wikipedia,omitempty"`
}

type PersonImagesResponse struct {
	Headshot string `json:"headshot,omitempty"`
	Fanart   string `json:"fanart,omitempty"`
}

type PersonProfileResponse struct {
	Name                string               `json:"name"`
	IDs                 PersonIDsResponse    `json:"ids"`
	Biography           string               `json:"biography"`
	Birthday            string               `json:"birthday,omitempty"`
	Death               string               `json:"death,omitempty"`
	Birthplace          string               `json:"birthplace,omitempty"`
	Homepage            string               `json:"homepage,omitempty"`
	SocialIDs           PersonSocialResponse `json:"socialIds"`
	Images              PersonImagesResponse `json:"images"`
	KnownForDepartments []string             `json:"knownForDepartments"`
}

type PersonMovieCreditItem struct {
	Role     string            `json:"role,omitempty"`
	Jobs     []string          `json:"jobs,omitempty"`
	Title    string            `json:"title"`
	Year     int               `json:"year"`
	Rating   float64           `json:"rating"`
	Votes    int               `json:"votes"`
	Overview string            `json:"overview,omitempty"`
	Genres   []string          `json:"genres,omitempty"`
	Poster   string            `json:"poster,omitempty"`
	IDs      PersonIDsResponse `json:"ids"`
}

type PersonShowCreditItem struct {
	Role         string            `json:"role,omitempty"`
	Jobs         []string          `json:"jobs,omitempty"`
	EpisodeCount int               `json:"episodeCount,omitempty"`
	Title        string            `json:"title"`
	Year         int               `json:"year"`
	Rating       float64           `json:"rating"`
	Votes        int               `json:"votes"`
	Status       string            `json:"status,omitempty"`
	Genres       []string          `json:"genres,omitempty"`
	Poster       string            `json:"poster,omitempty"`
	IDs          PersonIDsResponse `json:"ids"`
}

type PersonMovieCreditsGroup struct {
	Directing  []PersonMovieCreditItem `json:"directing"`
	Writing    []PersonMovieCreditItem `json:"writing"`
	Acting     []PersonMovieCreditItem `json:"acting"`
	Production []PersonMovieCreditItem `json:"production"`
}

type PersonShowCreditsGroup struct {
	Directing  []PersonShowCreditItem `json:"directing"`
	Writing    []PersonShowCreditItem `json:"writing"`
	Acting     []PersonShowCreditItem `json:"acting"`
	Production []PersonShowCreditItem `json:"production"`
}

type PersonDetailResponse struct {
	Person       PersonProfileResponse   `json:"person"`
	MovieCredits PersonMovieCreditsGroup `json:"movieCredits"`
	ShowCredits  PersonShowCreditsGroup  `json:"showCredits"`
}
