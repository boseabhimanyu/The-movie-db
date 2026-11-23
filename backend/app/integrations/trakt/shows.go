package trakt

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
)

type Airs struct {
	Day      string `json:"day"`
	Time     string `json:"time"`
	Timezone string `json:"timezone"`
}

type Show struct {
	Title         string   `json:"title"`
	Year          int      `json:"year"`
	IDs           IDs      `json:"ids"`
	Tagline       string   `json:"tagline"`
	Overview      string   `json:"overview"`
	FirstAired    string   `json:"first_aired"`
	Airs          Airs     `json:"airs"`
	Runtime       int      `json:"runtime"`
	Certification string   `json:"certification"`
	Network       string   `json:"network"`
	Country       string   `json:"country"`
	Trailer       string   `json:"trailer"`
	Homepage      string   `json:"homepage"`
	Status        string   `json:"status"`
	Rating        float64  `json:"rating"`
	Votes         int      `json:"votes"`
	Language      string   `json:"language"`
	Genres        []string `json:"genres"`
	AiredEpisodes int      `json:"aired_episodes"`
}

type TrendingShowItem struct {
	Watchers int  `json:"watchers"`
	Show     Show `json:"show"`
}

type SearchShowItem struct {
	Type  string  `json:"type"`
	Score float64 `json:"score"`
	Show  Show    `json:"show"`
}

type Episode struct {
	Season     int     `json:"season"`
	Number     int     `json:"number"`
	Title      string  `json:"title"`
	Overview   string  `json:"overview"`
	FirstAired string  `json:"first_aired"`
	Runtime    int     `json:"runtime"`
	Rating     float64 `json:"rating"`
	Votes      int     `json:"votes"`
	IDs        IDs     `json:"ids"`
}

type Season struct {
	Number        int       `json:"number"`
	Title         string    `json:"title"`
	Overview      string    `json:"overview"`
	EpisodeCount  int       `json:"episode_count"`
	AiredEpisodes int       `json:"aired_episodes"`
	Rating        float64   `json:"rating"`
	FirstAired    string    `json:"first_aired"`
	Network       string    `json:"network"`
	IDs           IDs       `json:"ids"`
	Episodes      []Episode `json:"episodes"`
}

func (c *Client) GetTrendingShows(
	ctx context.Context,
	page, limit int,
	country, genre string,
) ([]TrendingShowItem, PaginationMeta, error) {
	q := url.Values{}
	q.Set("page", strconv.Itoa(page))
	q.Set("limit", strconv.Itoa(limit))
	q.Set("extended", "full")
	applyFeedFilters(q, country, genre)

	var items []TrendingShowItem
	meta, err := c.get(ctx, "/shows/trending", q, &items)
	return items, meta, err
}

func (c *Client) GetPopularShows(
	ctx context.Context,
	page, limit int,
	country, genre string,
) ([]Show, PaginationMeta, error) {
	q := url.Values{}
	q.Set("page", strconv.Itoa(page))
	q.Set("limit", strconv.Itoa(limit))
	q.Set("extended", "full")
	applyFeedFilters(q, country, genre)

	var items []Show
	meta, err := c.get(ctx, "/shows/popular", q, &items)
	return items, meta, err
}

func (c *Client) SearchShows(
	ctx context.Context,
	query string,
	page, limit int,
) ([]SearchShowItem, PaginationMeta, error) {
	q := url.Values{}
	q.Set("query", query)
	q.Set("page", strconv.Itoa(page))
	q.Set("limit", strconv.Itoa(limit))
	q.Set("extended", "full")

	var items []SearchShowItem
	meta, err := c.get(ctx, "/search/show", q, &items)
	return items, meta, err
}

func (c *Client) GetShowSummary(
	ctx context.Context,
	idOrSlug string,
) (Show, error) {
	q := url.Values{}
	q.Set("extended", "full")

	var show Show
	_, err := c.get(
		ctx,
		fmt.Sprintf("/shows/%s", url.PathEscape(idOrSlug)),
		q,
		&show,
	)
	return show, err
}

func (c *Client) GetShowSeasons(
	ctx context.Context,
	idOrSlug string,
) ([]Season, error) {
	q := url.Values{}
	q.Set("extended", "full,episodes")

	var seasons []Season
	_, err := c.get(
		ctx,
		fmt.Sprintf("/shows/%s/seasons", url.PathEscape(idOrSlug)),
		q,
		&seasons,
	)
	return seasons, err
}

func (c *Client) GetShowPeople(
	ctx context.Context,
	idOrSlug string,
) (PeopleResponse, error) {
	q := url.Values{}
	q.Set("extended", "full")

	var people PeopleResponse
	_, err := c.get(
		ctx,
		fmt.Sprintf("/shows/%s/people", url.PathEscape(idOrSlug)),
		q,
		&people,
	)
	return people, err
}
