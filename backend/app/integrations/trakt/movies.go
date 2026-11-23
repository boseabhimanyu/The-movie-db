package trakt

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
)

type Movie struct {
	Title         string   `json:"title"`
	Year          int      `json:"year"`
	IDs           IDs      `json:"ids"`
	Tagline       string   `json:"tagline"`
	Overview      string   `json:"overview"`
	Released      string   `json:"released"`
	Runtime       int      `json:"runtime"`
	Country       string   `json:"country"`
	Trailer       string   `json:"trailer"`
	Homepage      string   `json:"homepage"`
	Status        string   `json:"status"`
	Rating        float64  `json:"rating"`
	Votes         int      `json:"votes"`
	Language      string   `json:"language"`
	Genres        []string `json:"genres"`
	Certification string   `json:"certification"`
}

type TrendingMovieItem struct {
	Watchers int   `json:"watchers"`
	Movie    Movie `json:"movie"`
}

type SearchMovieItem struct {
	Type  string  `json:"type"`
	Score float64 `json:"score"`
	Movie Movie   `json:"movie"`
}

type CastEntry struct {
	Characters []string `json:"characters"`
	Person     Person   `json:"person"`
}

type CrewEntry struct {
	Jobs   []string `json:"jobs"`
	Person Person   `json:"person"`
}

type PeopleResponse struct {
	Cast []CastEntry `json:"cast"`
	Crew struct {
		Directing []CrewEntry `json:"directing"`
		Writing   []CrewEntry `json:"writing"`
	} `json:"crew"`
}

func (c *Client) GetTrendingMovies(
	ctx context.Context,
	page, limit int,
	country, genre string,
) ([]TrendingMovieItem, PaginationMeta, error) {
	q := url.Values{}
	q.Set("page", strconv.Itoa(page))
	q.Set("limit", strconv.Itoa(limit))
	q.Set("extended", "full")
	applyFeedFilters(q, country, genre)

	var items []TrendingMovieItem
	meta, err := c.get(ctx, "/movies/trending", q, &items)
	return items, meta, err
}

func (c *Client) GetPopularMovies(
	ctx context.Context,
	page, limit int,
	country, genre string,
) ([]Movie, PaginationMeta, error) {
	q := url.Values{}
	q.Set("page", strconv.Itoa(page))
	q.Set("limit", strconv.Itoa(limit))
	q.Set("extended", "full")
	applyFeedFilters(q, country, genre)

	var items []Movie
	meta, err := c.get(ctx, "/movies/popular", q, &items)
	return items, meta, err
}

func (c *Client) SearchMovies(
	ctx context.Context,
	query string,
	page, limit int,
) ([]SearchMovieItem, PaginationMeta, error) {
	q := url.Values{}
	q.Set("query", query)
	q.Set("page", strconv.Itoa(page))
	q.Set("limit", strconv.Itoa(limit))
	q.Set("extended", "full")

	var items []SearchMovieItem
	meta, err := c.get(ctx, "/search/movie", q, &items)
	return items, meta, err
}

func (c *Client) GetMovieSummary(
	ctx context.Context,
	idOrSlug string,
) (Movie, error) {
	q := url.Values{}
	q.Set("extended", "full")

	var movie Movie
	_, err := c.get(
		ctx,
		fmt.Sprintf("/movies/%s", url.PathEscape(idOrSlug)),
		q,
		&movie,
	)
	return movie, err
}

func (c *Client) GetMoviePeople(
	ctx context.Context,
	idOrSlug string,
) (PeopleResponse, error) {
	q := url.Values{}
	q.Set("extended", "full")

	var people PeopleResponse
	_, err := c.get(
		ctx,
		fmt.Sprintf("/movies/%s/people", url.PathEscape(idOrSlug)),
		q,
		&people,
	)
	return people, err
}
