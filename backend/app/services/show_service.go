package services

import (
	"context"
	"movie-app/config"
	"movie-app/dto"
	"movie-app/integrations/fanart"
	"movie-app/integrations/trakt"
	"movie-app/models"
	"movie-app/repository"
	"strings"
	"sync"
	"time"
)

type ShowService struct {
	repo         repository.ShowRepository
	traktClient  *trakt.Client
	fanartClient *fanart.Client
	cacheTTL     time.Duration
}

func NewShowService(
	repo repository.ShowRepository,
	traktClient *trakt.Client,
	fanartClient *fanart.Client,
	cfg config.Config,
) *ShowService {
	ttlHours := cfg.MediaCacheTTLHours
	if ttlHours <= 0 {
		ttlHours = 24
	}

	return &ShowService{
		repo:         repo,
		traktClient:  traktClient,
		fanartClient: fanartClient,
		cacheTTL:     time.Duration(ttlHours) * time.Hour,
	}
}

func (s *ShowService) isFresh(show *models.Show) bool {
	if show == nil || show.SyncedAt.IsZero() {
		return false
	}
	return time.Since(show.SyncedAt) < s.cacheTTL
}

func (s *ShowService) hasFullDetails(show *models.Show) bool {
	hasCredits := len(show.Credits.Cast) > 0 ||
		len(show.Credits.Directors) > 0 ||
		len(show.Credits.Writers) > 0
	return hasCredits && len(show.Seasons) > 0
}

// GetShowDetails checks MongoDB first; on miss or stale cache, fetches Trakt show summary,
// seasons/episodes, people, and Fanart.tv artwork (bridged via TVDB ID) concurrently.
func (s *ShowService) GetShowDetails(
	ctx context.Context,
	idOrSlug string,
) (*models.Show, error) {
	cached, err := s.repo.FindByIDOrSlug(ctx, idOrSlug)
	if err == nil && s.isFresh(cached) && s.hasFullDetails(cached) {
		return cached, nil
	}

	lookupKey := strings.TrimSpace(idOrSlug)
	if cached != nil && cached.IDs.Slug != "" {
		lookupKey = cached.IDs.Slug
	}

	summary, err := s.traktClient.GetShowSummary(ctx, lookupKey)
	if err != nil {
		if cached != nil {
			return cached, nil
		}
		return nil, err
	}

	var (
		seasons []trakt.Season
		people  trakt.PeopleResponse
		artRes  fanart.TVArtworkResponse
		artErr  error
		wg      sync.WaitGroup
	)

	wg.Add(2)
	go func() {
		defer wg.Done()
		if sc, err := s.traktClient.GetShowSeasons(ctx, lookupKey); err == nil {
			seasons = sc
		}
	}()

	go func() {
		defer wg.Done()
		if p, err := s.traktClient.GetShowPeople(ctx, lookupKey); err == nil {
			people = p
		}
	}()

	if summary.IDs.TVDB > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			artRes, artErr = s.fanartClient.GetTVArtwork(ctx, summary.IDs.TVDB)
		}()
	}

	wg.Wait()

	show := mapTraktShow(summary)
	show.Credits = mapTraktCredits(people)

	var seasonPosters map[int]string
	if summary.IDs.TVDB > 0 && artErr == nil {
		show.Artwork = mapTVArtwork(artRes)
		seasonPosters = fanart.SeasonPosterMap(artRes.SeasonPoster)
	} else if cached != nil {
		show.Artwork = cached.Artwork
	}

	show.Seasons = mapTraktSeasons(seasons, seasonPosters)

	return s.repo.UpsertByTraktID(ctx, &show)
}

func (s *ShowService) GetTrendingShows(
	ctx context.Context,
	page, limit int,
) (dto.TrendingShowsResponse, error) {
	page, limit = normalizePagination(page, limit)

	items, meta, err := s.traktClient.GetTrendingShows(ctx, page, limit)
	if err != nil {
		return dto.TrendingShowsResponse{}, err
	}

	rawShows := make([]trakt.Show, len(items))
	for i, item := range items {
		rawShows[i] = item.Show
	}

	stitched := s.stitchAndCacheShows(ctx, rawShows)

	results := make([]dto.TrendingShowResult, len(stitched))
	for i, sh := range stitched {
		results[i] = dto.TrendingShowResult{
			Watchers: items[i].Watchers,
			Show:     sh,
		}
	}

	return dto.TrendingShowsResponse{
		Results: results,
		Pagination: dto.PaginationResponse{
			Page:       maxInt(meta.Page, page),
			Limit:      maxInt(meta.Limit, limit),
			TotalPages: meta.TotalPages,
			TotalItems: meta.TotalItems,
		},
	}, nil
}

func (s *ShowService) GetPopularShows(
	ctx context.Context,
	page, limit int,
) (dto.ShowListResponse, error) {
	page, limit = normalizePagination(page, limit)

	rawShows, meta, err := s.traktClient.GetPopularShows(ctx, page, limit)
	if err != nil {
		return dto.ShowListResponse{}, err
	}

	stitched := s.stitchAndCacheShows(ctx, rawShows)

	return dto.ShowListResponse{
		Shows: stitched,
		Pagination: dto.PaginationResponse{
			Page:       maxInt(meta.Page, page),
			Limit:      maxInt(meta.Limit, limit),
			TotalPages: meta.TotalPages,
			TotalItems: meta.TotalItems,
		},
	}, nil
}

func (s *ShowService) SearchShows(
	ctx context.Context,
	query string,
	page, limit int,
) (dto.ShowListResponse, error) {
	page, limit = normalizePagination(page, limit)
	q := strings.TrimSpace(query)

	items, meta, err := s.traktClient.SearchShows(ctx, q, page, limit)
	if err != nil {
		local, total, localErr := s.repo.SearchLocal(ctx, q, page, limit)
		if localErr != nil {
			return dto.ShowListResponse{}, err
		}
		totalPages := int((total + int64(limit) - 1) / int64(limit))
		return dto.ShowListResponse{
			Shows: local,
			Pagination: dto.PaginationResponse{
				Page:       page,
				Limit:      limit,
				TotalPages: totalPages,
				TotalItems: int(total),
			},
		}, nil
	}

	rawShows := make([]trakt.Show, len(items))
	for i, item := range items {
		rawShows[i] = item.Show
	}

	stitched := s.stitchAndCacheShows(ctx, rawShows)

	return dto.ShowListResponse{
		Shows: stitched,
		Pagination: dto.PaginationResponse{
			Page:       maxInt(meta.Page, page),
			Limit:      maxInt(meta.Limit, limit),
			TotalPages: meta.TotalPages,
			TotalItems: meta.TotalItems,
		},
	}, nil
}

func (s *ShowService) stitchAndCacheShows(
	ctx context.Context,
	rawShows []trakt.Show,
) []models.Show {
	results := make([]models.Show, len(rawShows))
	sem := make(chan struct{}, 5)
	var wg sync.WaitGroup

	for i, raw := range rawShows {
		wg.Add(1)
		go func(idx int, ts trakt.Show) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			show := mapTraktShow(ts)

			cached, err := s.repo.FindByTraktID(ctx, ts.IDs.Trakt)
			if err == nil && s.isFresh(cached) && cached.Artwork.Poster != "" {
				show.Artwork = cached.Artwork
			} else if ts.IDs.TVDB > 0 {
				if artRes, artErr := s.fanartClient.GetTVArtwork(ctx, ts.IDs.TVDB); artErr == nil {
					show.Artwork = mapTVArtwork(artRes)
				} else if cached != nil {
					show.Artwork = cached.Artwork
				}
			}

			if saved, upsertErr := s.repo.UpsertByTraktID(ctx, &show); upsertErr == nil {
				results[idx] = *saved
			} else {
				results[idx] = show
			}
		}(i, raw)
	}

	wg.Wait()
	return results
}

func mapTraktShow(ts trakt.Show) models.Show {
	return models.Show{
		Title:      ts.Title,
		Year:       ts.Year,
		IDs:        mapExternalIDs(ts.IDs),
		Tagline:    ts.Tagline,
		Overview:   ts.Overview,
		FirstAired: ts.FirstAired,
		Airs: models.ShowAirTime{
			Day:      ts.Airs.Day,
			Time:     ts.Airs.Time,
			Timezone: ts.Airs.Timezone,
		},
		Runtime:       ts.Runtime,
		Certification: ts.Certification,
		Network:       ts.Network,
		Country:       ts.Country,
		Trailer:       ts.Trailer,
		Homepage:      ts.Homepage,
		Status:        ts.Status,
		Rating:        ts.Rating,
		Votes:         ts.Votes,
		Language:      ts.Language,
		Genres:        ts.Genres,
		AiredEpisodes: ts.AiredEpisodes,
	}
}

func mapTVArtwork(art fanart.TVArtworkResponse) models.MediaArtwork {
	return models.MediaArtwork{
		Poster:    fanart.FirstURL(art.TVPoster),
		Backdrop:  fanart.FirstURL(art.ShowBG),
		Logo:      fanart.FirstURL(art.HDTVLogo, art.ClearLogo),
		Banner:    fanart.FirstURL(art.TVBanner),
		Thumb:     fanart.FirstURL(art.TVThumb),
		Posters:   fanart.RankURLs(art.TVPoster, 10),
		Backdrops: fanart.RankURLs(art.ShowBG, 10),
	}
}

func mapTraktSeasons(
	seasons []trakt.Season,
	seasonPosters map[int]string,
) []models.ShowSeason {
	result := make([]models.ShowSeason, 0, len(seasons))
	for _, s := range seasons {
		episodes := make([]models.ShowEpisodeSummary, 0, len(s.Episodes))
		for _, ep := range s.Episodes {
			episodes = append(episodes, models.ShowEpisodeSummary{
				Number:     ep.Number,
				Title:      ep.Title,
				Overview:   ep.Overview,
				FirstAired: ep.FirstAired,
				Runtime:    ep.Runtime,
				Rating:     ep.Rating,
				Votes:      ep.Votes,
				IDs:        mapExternalIDs(ep.IDs),
			})
		}

		poster := ""
		if seasonPosters != nil {
			poster = seasonPosters[s.Number]
		}

		result = append(result, models.ShowSeason{
			Number:        s.Number,
			Title:         s.Title,
			Overview:      s.Overview,
			EpisodeCount:  s.EpisodeCount,
			AiredEpisodes: s.AiredEpisodes,
			Rating:        s.Rating,
			FirstAired:    s.FirstAired,
			Network:       s.Network,
			Poster:        poster,
			IDs:           mapExternalIDs(s.IDs),
			Episodes:      episodes,
		})
	}
	return result
}

func (s *ShowService) ForceSyncShow(
	ctx context.Context,
	idOrSlug string,
) (*models.Show, error) {
	cached, _ := s.repo.FindByIDOrSlug(ctx, idOrSlug)

	lookupKey := strings.TrimSpace(idOrSlug)
	if cached != nil && cached.IDs.Slug != "" {
		lookupKey = cached.IDs.Slug
	}

	summary, err := s.traktClient.GetShowSummary(ctx, lookupKey)
	if err != nil {
		return nil, err
	}

	var (
		seasons []trakt.Season
		people  trakt.PeopleResponse
		artRes  fanart.TVArtworkResponse
		artErr  error
		wg      sync.WaitGroup
	)

	wg.Add(2)
	go func() {
		defer wg.Done()
		if sc, err := s.traktClient.GetShowSeasons(ctx, lookupKey); err == nil {
			seasons = sc
		}
	}()

	go func() {
		defer wg.Done()
		if p, err := s.traktClient.GetShowPeople(ctx, lookupKey); err == nil {
			people = p
		}
	}()

	if summary.IDs.TVDB > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			artRes, artErr = s.fanartClient.GetTVArtwork(ctx, summary.IDs.TVDB)
		}()
	}

	wg.Wait()

	show := mapTraktShow(summary)
	show.Credits = mapTraktCredits(people)

	var seasonPosters map[int]string
	if summary.IDs.TVDB > 0 && artErr == nil {
		show.Artwork = mapTVArtwork(artRes)
		seasonPosters = fanart.SeasonPosterMap(artRes.SeasonPoster)
	} else if cached != nil {
		show.Artwork = cached.Artwork
	}

	show.Seasons = mapTraktSeasons(seasons, seasonPosters)

	return s.repo.UpsertByTraktID(ctx, &show)
}
