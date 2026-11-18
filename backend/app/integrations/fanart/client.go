package fanart

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
)

const defaultBaseURL = "https://webservice.fanart.tv/v3"

var ErrNotFound = errors.New("fanart resource not found")

type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

type ImageAsset struct {
	ID     string `json:"id"`
	URL    string `json:"url"`
	Lang   string `json:"lang"`
	Likes  string `json:"likes"`
	Season string `json:"season,omitempty"`
}

type MovieArtworkResponse struct {
	Name            string       `json:"name"`
	TMDBID          string       `json:"tmdb_id"`
	IMDBID          string       `json:"imdb_id"`
	MoviePoster     []ImageAsset `json:"movieposter"`
	MovieBackground []ImageAsset `json:"moviebackground"`
	HDMovieClearArt []ImageAsset `json:"hdmovieclearart"`
	HDMovieLogo     []ImageAsset `json:"hdmovielogo"`
	MovieLogo       []ImageAsset `json:"movielogo"`
	MovieBanner     []ImageAsset `json:"moviebanner"`
	MovieThumb      []ImageAsset `json:"moviethumb"`
}

type TVArtworkResponse struct {
	Name         string       `json:"name"`
	TheTVDBID    string       `json:"thetvdb_id"`
	TVPoster     []ImageAsset `json:"tvposter"`
	ShowBG       []ImageAsset `json:"showbackground"`
	HDTVLogo     []ImageAsset `json:"hdtvlogo"`
	ClearLogo    []ImageAsset `json:"clearlogo"`
	TVBanner     []ImageAsset `json:"tvbanner"`
	TVThumb      []ImageAsset `json:"tvthumb"`
	SeasonPoster []ImageAsset `json:"seasonposter"`
}

func NewClient(apiKey string) *Client {
	return &Client{
		baseURL: defaultBaseURL,
		apiKey:  strings.TrimSpace(apiKey),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) get(
	ctx context.Context,
	path string,
	out any,
) error {
	endpoint := fmt.Sprintf("%s%s?api_key=%s", c.baseURL, path, c.apiKey)

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		endpoint,
		nil,
	)
	if err != nil {
		return err
	}

	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return ErrNotFound
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf(
			"fanart api error (%d): %s",
			resp.StatusCode,
			strings.TrimSpace(string(body)),
		)
	}

	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("failed to decode fanart response: %w", err)
	}

	return nil
}

func (c *Client) GetMovieArtwork(
	ctx context.Context,
	tmdbID int,
) (MovieArtworkResponse, error) {
	var res MovieArtworkResponse
	if tmdbID <= 0 {
		return res, ErrNotFound
	}
	err := c.get(ctx, fmt.Sprintf("/movies/%d", tmdbID), &res)
	return res, err
}

func (c *Client) GetTVArtwork(
	ctx context.Context,
	tvdbID int,
) (TVArtworkResponse, error) {
	var res TVArtworkResponse
	if tvdbID <= 0 {
		return res, ErrNotFound
	}
	err := c.get(ctx, fmt.Sprintf("/tv/%d", tvdbID), &res)
	return res, err
}

// RankURLs sorts assets by preferred language ("en", "00", "") and highest likes,
// returning up to maxItems unique HTTPS URLs.
func RankURLs(assets []ImageAsset, maxItems int) []string {
	if len(assets) == 0 {
		return []string{}
	}

	sorted := make([]ImageAsset, len(assets))
	copy(sorted, assets)

	sort.SliceStable(sorted, func(i, j int) bool {
		pi := langPriority(sorted[i].Lang)
		pj := langPriority(sorted[j].Lang)
		if pi != pj {
			return pi < pj
		}
		li, _ := strconv.Atoi(sorted[i].Likes)
		lj, _ := strconv.Atoi(sorted[j].Likes)
		return li > lj
	})

	urls := make([]string, 0, len(sorted))
	seen := make(map[string]struct{}, len(sorted))
	for _, asset := range sorted {
		u := strings.TrimSpace(asset.URL)
		if u == "" {
			continue
		}
		if _, exists := seen[u]; exists {
			continue
		}
		seen[u] = struct{}{}
		urls = append(urls, u)
		if maxItems > 0 && len(urls) >= maxItems {
			break
		}
	}

	return urls
}

func FirstURL(groups ...[]ImageAsset) string {
	for _, group := range groups {
		urls := RankURLs(group, 1)
		if len(urls) > 0 {
			return urls[0]
		}
	}
	return ""
}

// SeasonPosterMap maps season number -> best poster URL from Fanart.tv seasonposter assets.
func SeasonPosterMap(assets []ImageAsset) map[int]string {
	bySeason := make(map[int][]ImageAsset)
	for _, asset := range assets {
		seasonNum, err := strconv.Atoi(strings.TrimSpace(asset.Season))
		if err != nil {
			continue
		}
		bySeason[seasonNum] = append(bySeason[seasonNum], asset)
	}

	result := make(map[int]string, len(bySeason))
	for seasonNum, group := range bySeason {
		if url := FirstURL(group); url != "" {
			result[seasonNum] = url
		}
	}
	return result
}

func langPriority(lang string) int {
	switch strings.ToLower(strings.TrimSpace(lang)) {
	case "en":
		return 0
	case "00", "":
		return 1
	default:
		return 2
	}
}
