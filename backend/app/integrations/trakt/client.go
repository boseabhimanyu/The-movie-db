package trakt

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const defaultBaseURL = "https://api.trakt.tv"

var (
	ErrNotFound    = errors.New("trakt resource not found")
	ErrRateLimited = errors.New("trakt rate limit exceeded")
)

type Client struct {
	baseURL    string
	clientID   string
	httpClient *http.Client
}

type PaginationMeta struct {
	Page       int
	Limit      int
	TotalPages int
	TotalItems int
}

type IDs struct {
	Trakt int    `json:"trakt"`
	Slug  string `json:"slug"`
	IMDB  string `json:"imdb"`
	TMDB  int    `json:"tmdb"`
	TVDB  int    `json:"tvdb"`
}

func NewClient(clientID string) *Client {
	return &Client{
		baseURL:  defaultBaseURL,
		clientID: strings.TrimSpace(clientID),
		httpClient: &http.Client{
			Timeout: 12 * time.Second,
		},
	}
}

func (c *Client) get(
	ctx context.Context,
	path string,
	query url.Values,
	out any,
) (PaginationMeta, error) {
	var meta PaginationMeta

	endpoint := c.baseURL + path
	if len(query) > 0 {
		endpoint += "?" + query.Encode()
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		endpoint,
		nil,
	)
	if err != nil {
		return meta, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("trakt-api-version", "2")
	req.Header.Set("trakt-api-key", c.clientID)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return meta, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return meta, ErrNotFound
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		return meta, ErrRateLimited
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return meta, fmt.Errorf(
			"trakt api error (%d): %s",
			resp.StatusCode,
			strings.TrimSpace(string(body)),
		)
	}

	meta.Page, _ = strconv.Atoi(resp.Header.Get("X-Pagination-Page"))
	meta.Limit, _ = strconv.Atoi(resp.Header.Get("X-Pagination-Limit"))
	meta.TotalPages, _ = strconv.Atoi(resp.Header.Get("X-Pagination-Page-Count"))
	meta.TotalItems, _ = strconv.Atoi(resp.Header.Get("X-Pagination-Item-Count"))

	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return meta, fmt.Errorf("failed to decode trakt response: %w", err)
	}

	return meta, nil
}

func applyFeedFilters(q url.Values, country, genre string) {
	if c := strings.ToLower(strings.TrimSpace(country)); c != "" {
		q.Set("countries", c)
	}
	if g := strings.ToLower(strings.TrimSpace(genre)); g != "" {
		q.Set("genres", g)
	}
}
