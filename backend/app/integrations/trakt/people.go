package trakt

import (
	"context"
	"fmt"
	"net/url"
	"strings"
)

type PersonImages struct {
	Headshot []string `json:"headshot"`
	Fanart   []string `json:"fanart"`
}

type PersonSocialIDs struct {
	Twitter   string `json:"twitter"`
	Facebook  string `json:"facebook"`
	Instagram string `json:"instagram"`
	Wikipedia string `json:"wikipedia"`
}

type PersonProfile struct {
	Name       string          `json:"name"`
	IDs        IDs             `json:"ids"`
	Biography  string          `json:"biography"`
	Birthday   string          `json:"birthday"`
	Death      string          `json:"death"`
	Birthplace string          `json:"birthplace"`
	Homepage   string          `json:"homepage"`
	SocialIDs  PersonSocialIDs `json:"social_ids"`
	Images     PersonImages    `json:"images"`
}

type MediaImages struct {
	Poster []string `json:"poster"`
	Fanart []string `json:"fanart"`
	Thumb  []string `json:"thumb"`
}

type CreditMovie struct {
	Title    string      `json:"title"`
	Year     int         `json:"year"`
	IDs      IDs         `json:"ids"`
	Tagline  string      `json:"tagline"`
	Overview string      `json:"overview"`
	Runtime  int         `json:"runtime"`
	Genres   []string    `json:"genres"`
	Rating   float64     `json:"rating"`
	Votes    int         `json:"votes"`
	Images   MediaImages `json:"images"`
}

type CreditShow struct {
	Title    string      `json:"title"`
	Year     int         `json:"year"`
	IDs      IDs         `json:"ids"`
	Overview string      `json:"overview"`
	Status   string      `json:"status"`
	Genres   []string    `json:"genres"`
	Rating   float64     `json:"rating"`
	Votes    int         `json:"votes"`
	Images   MediaImages `json:"images"`
}

type PersonMovieCastCredit struct {
	Character  string      `json:"character"`
	Characters []string    `json:"characters"`
	Movie      CreditMovie `json:"movie"`
}

type PersonMovieCrewCredit struct {
	Job   string      `json:"job"`
	Jobs  []string    `json:"jobs"`
	Movie CreditMovie `json:"movie"`
}

type PersonMovieCredits struct {
	Cast []PersonMovieCastCredit            `json:"cast"`
	Crew map[string][]PersonMovieCrewCredit `json:"crew"`
}

type PersonShowCastCredit struct {
	Character     string     `json:"character"`
	Characters    []string   `json:"characters"`
	EpisodeCount  int        `json:"episode_count"`
	SeriesRegular bool       `json:"series_regular"`
	Show          CreditShow `json:"show"`
}

type PersonShowCrewCredit struct {
	Job          string     `json:"job"`
	Jobs         []string   `json:"jobs"`
	EpisodeCount int        `json:"episode_count"`
	Show         CreditShow `json:"show"`
}

type PersonShowCredits struct {
	Cast []PersonShowCastCredit            `json:"cast"`
	Crew map[string][]PersonShowCrewCredit `json:"crew"`
}

type PersonSearchResult struct {
	Type   string        `json:"type"`
	Score  float64       `json:"score"`
	Person PersonProfile `json:"person"`
}

func (c *Client) GetPerson(ctx context.Context, idOrSlug string) (*PersonProfile, error) {
	q := url.Values{}
	q.Set("extended", "full")

	var out PersonProfile
	path := fmt.Sprintf("/people/%s", url.PathEscape(strings.TrimSpace(idOrSlug)))
	if _, err := c.get(ctx, path, q, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) GetPersonMovies(ctx context.Context, idOrSlug string) (*PersonMovieCredits, error) {
	q := url.Values{}
	q.Set("extended", "full")

	var out PersonMovieCredits
	path := fmt.Sprintf("/people/%s/movies", url.PathEscape(strings.TrimSpace(idOrSlug)))
	if _, err := c.get(ctx, path, q, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) GetPersonShows(ctx context.Context, idOrSlug string) (*PersonShowCredits, error) {
	q := url.Values{}
	q.Set("extended", "full")

	var out PersonShowCredits
	path := fmt.Sprintf("/people/%s/shows", url.PathEscape(strings.TrimSpace(idOrSlug)))
	if _, err := c.get(ctx, path, q, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) SearchPeople(
	ctx context.Context,
	query string,
	page, limit int,
) ([]PersonSearchResult, PaginationMeta, error) {
	q := url.Values{}
	q.Set("query", strings.TrimSpace(query))
	q.Set("extended", "full")
	if page > 0 {
		q.Set("page", fmt.Sprintf("%d", page))
	}
	if limit > 0 {
		q.Set("limit", fmt.Sprintf("%d", limit))
	}

	var out []PersonSearchResult
	meta, err := c.get(ctx, "/search/person", q, &out)
	if err != nil {
		return nil, meta, err
	}
	return out, meta, nil
}
