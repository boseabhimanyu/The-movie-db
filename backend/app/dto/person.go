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
	Acting      []PersonMovieCreditItem            `json:"acting"`
	Departments map[string][]PersonMovieCreditItem `json:"departments"`
}

type PersonShowCreditsGroup struct {
	Acting      []PersonShowCreditItem            `json:"acting"`
	Departments map[string][]PersonShowCreditItem `json:"departments"`
}

type PersonDetailResponse struct {
	Person       PersonProfileResponse   `json:"person"`
	MovieCredits PersonMovieCreditsGroup `json:"movieCredits"`
	ShowCredits  PersonShowCreditsGroup  `json:"showCredits"`
}

type PersonSearchItem struct {
	Score              float64              `json:"score"`
	Name               string               `json:"name"`
	KnownForDepartment string               `json:"known_for_department,omitempty"`
	IDs                PersonIDsResponse    `json:"ids"`
	Biography          string               `json:"biography,omitempty"`
	Birthday           string               `json:"birthday,omitempty"`
	Birthplace         string               `json:"birthplace,omitempty"`
	Images             PersonImagesResponse `json:"images"`
}

type PersonPaginationMeta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalPages int `json:"totalPages"`
	TotalItems int `json:"totalItems"`
}

type PersonSearchResponse struct {
	Results    []PersonSearchItem   `json:"results"`
	Pagination PersonPaginationMeta `json:"pagination"`
}
