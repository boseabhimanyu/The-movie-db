package services

import (
	"context"
	"errors"
	"fmt"
	"movie-app/apperrors"
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

type cachedMoviePage struct {
	movies     []models.Movie
	pagination dto.PaginationResponse
}

type MovieService struct {
	repo           repository.MovieRepository
	traktClient    *trakt.Client
	fanartClient   *fanart.Client
	cacheTTL       time.Duration
	batchSyncLimit int
	feedCache      *feedCache[cachedMoviePage]
}

func NewMovieService(
	repo repository.MovieRepository,
	traktClient *trakt.Client,
	fanartClient *fanart.Client,
	cfg config.Config,
) *MovieService {
	ttlHours := cfg.MediaCacheTTLHours
	if ttlHours <= 0 {
		ttlHours = 24
	}

	batchLimit := cfg.MediaBatchSyncLimit
	if batchLimit <= 0 {
		batchLimit = 10
	}

	feedTTL := time.Duration(cfg.MediaFeedCacheTTLMinutes) * time.Minute

	return &MovieService{
		repo:           repo,
		traktClient:    traktClient,
		fanartClient:   fanartClient,
		cacheTTL:       time.Duration(ttlHours) * time.Hour,
		batchSyncLimit: batchLimit,
		feedCache:      newFeedCache[cachedMoviePage](feedTTL),
	}
}

func (s *MovieService) BatchSyncLimit() int {
	return s.batchSyncLimit
}

func (s *MovieService) isFresh(movie *models.Movie) bool {
	if movie == nil || movie.SyncedAt.IsZero() {
		return false
	}
	return time.Since(movie.SyncedAt) < s.cacheTTL
}

func (s *MovieService) hasFullDetails(movie *models.Movie) bool {
	return len(movie.Credits.Cast) > 0 ||
		len(movie.Credits.Directors) > 0 ||
		len(movie.Credits.Writers) > 0
}

// GetMovieDetails checks MongoDB first; on miss or stale cache, fetches Trakt summary + people
// and Fanart.tv artwork concurrently, stitches them, and upserts to MongoDB.
func (s *MovieService) GetMovieDetails(
	ctx context.Context,
	idOrSlug string,
) (*models.Movie, error) {
	cached, err := s.repo.FindByIDOrSlug(ctx, idOrSlug)
	if err == nil && s.isFresh(cached) && s.hasFullDetails(cached) && cached.Artwork.Poster != "" {
		return cached, nil
	}

	lookupKey := strings.TrimSpace(idOrSlug)
	if cached != nil && cached.IDs.Slug != "" {
		lookupKey = cached.IDs.Slug
	}

	summary, err := s.traktClient.GetMovieSummary(ctx, lookupKey)
	if err != nil {
		// Fallback to stale cache if Trakt is temporarily unreachable
		if cached != nil {
			return cached, nil
		}
		return nil, err
	}

	var (
		people trakt.PeopleResponse
		artRes fanart.MovieArtworkResponse
		artErr error
		wg     sync.WaitGroup
	)

	wg.Add(1)
	go func() {
		defer wg.Done()
		if p, err := s.traktClient.GetMoviePeople(ctx, lookupKey); err == nil {
			people = p
		}
	}()

	if summary.IDs.TMDB > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			artRes, artErr = s.fanartClient.GetMovieArtwork(ctx, summary.IDs.TMDB)
		}()
	}

	wg.Wait()

	movie := mapTraktMovie(summary)
	movie.Credits = mapTraktCredits(people)

	if summary.IDs.TMDB > 0 && artErr == nil {
		movie.Artwork = mapMovieArtwork(artRes)
	} else if cached != nil {
		movie.Artwork = cached.Artwork
	}
	movie.Artwork = applyTraktArtworkFallback(movie.Artwork, summary.Images)

	return s.repo.UpsertByTraktID(ctx, &movie)
}

func (s *MovieService) GetTrendingMovies(
	ctx context.Context,
	page, limit int,
	country, genre string,
) ([]models.Movie, dto.PaginationResponse, error) {
	page, limit = normalizePagination(page, limit)
	country = strings.ToLower(strings.TrimSpace(country))
	genre = strings.ToLower(strings.TrimSpace(genre))
	isGlobalUnfiltered := country == "" && genre == ""

	var cacheKey string
	if isGlobalUnfiltered {
		cacheKey = fmt.Sprintf("trending:%d:%d", page, limit)
		if cached, ok := s.feedCache.Get(cacheKey); ok {
			return cached.movies, cached.pagination, nil
		}
	}

	raw, meta, err := s.traktClient.GetTrendingMovies(ctx, page, limit, country, genre)
	if err != nil {
		return nil, dto.PaginationResponse{}, err
	}

	traktMovies := make([]trakt.Movie, 0, len(raw))
	for _, item := range raw {
		traktMovies = append(traktMovies, item.Movie)
	}

	movies := s.stitchAndCacheMovies(ctx, traktMovies)
	pagination := dto.PaginationResponse{
		Page:       maxInt(meta.Page, page),
		Limit:      maxInt(meta.Limit, limit),
		TotalPages: meta.TotalPages,
		TotalItems: meta.TotalItems,
	}

	if isGlobalUnfiltered {
		s.feedCache.Set(cacheKey, cachedMoviePage{
			movies:     movies,
			pagination: pagination,
		})
	}

	return movies, pagination, nil
}

func (s *MovieService) GetPopularMovies(
	ctx context.Context,
	page, limit int,
	country, genre string,
) ([]models.Movie, dto.PaginationResponse, error) {
	page, limit = normalizePagination(page, limit)
	country = strings.ToLower(strings.TrimSpace(country))
	genre = strings.ToLower(strings.TrimSpace(genre))
	isGlobalUnfiltered := country == "" && genre == ""

	var cacheKey string
	if isGlobalUnfiltered {
		cacheKey = fmt.Sprintf("popular:%d:%d", page, limit)
		if cached, ok := s.feedCache.Get(cacheKey); ok {
			return cached.movies, cached.pagination, nil
		}
	}

	raw, meta, err := s.traktClient.GetPopularMovies(ctx, page, limit, country, genre)
	if err != nil {
		return nil, dto.PaginationResponse{}, err
	}

	movies := s.stitchAndCacheMovies(ctx, raw)
	pagination := dto.PaginationResponse{
		Page:       maxInt(meta.Page, page),
		Limit:      maxInt(meta.Limit, limit),
		TotalPages: meta.TotalPages,
		TotalItems: meta.TotalItems,
	}

	if isGlobalUnfiltered {
		s.feedCache.Set(cacheKey, cachedMoviePage{
			movies:     movies,
			pagination: pagination,
		})
	}

	return movies, pagination, nil
}

func (s *MovieService) SearchMovies(
	ctx context.Context,
	query string,
	page, limit int,
) (dto.MovieListResponse, error) {
	page, limit = normalizePagination(page, limit)
	q := strings.TrimSpace(query)

	items, meta, err := s.traktClient.SearchMovies(ctx, q, page, limit)
	if err != nil {
		// Fallback to local MongoDB regex search if Trakt fails
		local, total, localErr := s.repo.SearchLocal(ctx, q, page, limit)
		if localErr != nil {
			return dto.MovieListResponse{}, err
		}
		totalPages := int((total + int64(limit) - 1) / int64(limit))
		return dto.MovieListResponse{
			Movies: local,
			Pagination: dto.PaginationResponse{
				Page:       page,
				Limit:      limit,
				TotalPages: totalPages,
				TotalItems: int(total),
			},
		}, nil
	}

	rawMovies := make([]trakt.Movie, len(items))
	for i, item := range items {
		rawMovies[i] = item.Movie
	}

	stitched := s.stitchAndCacheMovies(ctx, rawMovies)

	return dto.MovieListResponse{
		Movies: stitched,
		Pagination: dto.PaginationResponse{
			Page:       maxInt(meta.Page, page),
			Limit:      maxInt(meta.Limit, limit),
			TotalPages: meta.TotalPages,
			TotalItems: meta.TotalItems,
		},
	}, nil
}

func (s *MovieService) stitchAndCacheMovies(
	ctx context.Context,
	rawMovies []trakt.Movie,
) []models.Movie {
	results := make([]models.Movie, len(rawMovies))
	sem := make(chan struct{}, 5)
	var wg sync.WaitGroup

	for i, raw := range rawMovies {
		wg.Add(1)
		go func(idx int, tm trakt.Movie) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			movie := mapTraktMovie(tm)

			cached, err := s.repo.FindByTraktID(ctx, tm.IDs.Trakt)
			if err == nil && s.isFresh(cached) && cached.Artwork.Poster != "" {
				movie.Artwork = cached.Artwork
			} else {
				if tm.IDs.TMDB > 0 {
					if artRes, artErr := s.fanartClient.GetMovieArtwork(ctx, tm.IDs.TMDB); artErr == nil {
						movie.Artwork = mapMovieArtwork(artRes)
					} else if cached != nil {
						movie.Artwork = cached.Artwork
					}
				} else if cached != nil {
					movie.Artwork = cached.Artwork
				}
				movie.Artwork = applyTraktArtworkFallback(movie.Artwork, tm.Images)
			}

			if saved, upsertErr := s.repo.UpsertByTraktID(ctx, &movie); upsertErr == nil {
				results[idx] = *saved
			} else {
				results[idx] = movie
			}
		}(i, raw)
	}

	wg.Wait()
	return results
}

func mapTraktMovie(tm trakt.Movie) models.Movie {
	return models.Movie{
		Title:         tm.Title,
		Year:          tm.Year,
		IDs:           mapExternalIDs(tm.IDs),
		Tagline:       tm.Tagline,
		Overview:      tm.Overview,
		Released:      tm.Released,
		Runtime:       tm.Runtime,
		Country:       tm.Country,
		Trailer:       tm.Trailer,
		Homepage:      tm.Homepage,
		Status:        tm.Status,
		Rating:        tm.Rating,
		Votes:         tm.Votes,
		Language:      tm.Language,
		Genres:        tm.Genres,
		Certification: tm.Certification,
	}
}

func mapMovieArtwork(art fanart.MovieArtworkResponse) models.MediaArtwork {
	return models.MediaArtwork{
		Poster:    fanart.FirstURL(art.MoviePoster),
		Backdrop:  fanart.FirstURL(art.MovieBackground),
		Logo:      fanart.FirstURL(art.HDMovieLogo, art.MovieLogo),
		Banner:    fanart.FirstURL(art.MovieBanner),
		Thumb:     fanart.FirstURL(art.MovieThumb),
		Posters:   fanart.RankURLs(art.MoviePoster, 10),
		Backdrops: fanart.RankURLs(art.MovieBackground, 10),
	}
}

func mapExternalIDs(ids trakt.IDs) models.ExternalIDs {
	return models.ExternalIDs{
		Trakt: ids.Trakt,
		Slug:  ids.Slug,
		IMDB:  ids.IMDB,
		TMDB:  ids.TMDB,
		TVDB:  ids.TVDB,
	}
}

func mapTraktCredits(people trakt.PeopleResponse) models.MediaCredits {
	cast := make([]models.CastMember, 0, len(people.Cast))
	for _, c := range people.Cast {
		cast = append(cast, models.CastMember{
			TraktID:    c.Person.IDs.Trakt,
			Name:       c.Person.Name,
			Slug:       c.Person.IDs.Slug,
			Headshot:   firstNormalizedTraktURL(c.Person.Images.Headshot),
			Characters: c.Characters,
			IDs:        mapExternalIDs(c.Person.IDs),
		})
	}

	directors := make([]models.CrewMember, 0, len(people.Crew.Directing))
	for _, d := range people.Crew.Directing {
		directors = append(directors, models.CrewMember{
			TraktID:  d.Person.IDs.Trakt,
			Name:     d.Person.Name,
			Slug:     d.Person.IDs.Slug,
			Headshot: firstNormalizedTraktURL(d.Person.Images.Headshot),
			Jobs:     d.Jobs,
			IDs:      mapExternalIDs(d.Person.IDs),
		})
	}

	writers := make([]models.CrewMember, 0, len(people.Crew.Writing))
	for _, w := range people.Crew.Writing {
		writers = append(writers, models.CrewMember{
			TraktID:  w.Person.IDs.Trakt,
			Name:     w.Person.Name,
			Slug:     w.Person.IDs.Slug,
			Headshot: firstNormalizedTraktURL(w.Person.Images.Headshot),
			Jobs:     w.Jobs,
			IDs:      mapExternalIDs(w.Person.IDs),
		})
	}

	return models.MediaCredits{
		Cast:      cast,
		Directors: directors,
		Writers:   writers,
	}
}

func normalizePagination(page, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	return page, limit
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func IsMediaNotFound(err error) bool {
	return errors.Is(err, apperrors.ErrMediaNotFound) ||
		errors.Is(err, trakt.ErrNotFound)
}

func (s *MovieService) ForceSyncMovie(
	ctx context.Context,
	idOrSlug string,
) (*models.Movie, error) {
	cached, _ := s.repo.FindByIDOrSlug(ctx, idOrSlug)

	lookupKey := strings.TrimSpace(idOrSlug)
	if cached != nil && cached.IDs.Slug != "" {
		lookupKey = cached.IDs.Slug
	}

	summary, err := s.traktClient.GetMovieSummary(ctx, lookupKey)
	if err != nil {
		return nil, err
	}

	var (
		people trakt.PeopleResponse
		artRes fanart.MovieArtworkResponse
		artErr error
		wg     sync.WaitGroup
	)

	wg.Add(1)
	go func() {
		defer wg.Done()
		if p, err := s.traktClient.GetMoviePeople(ctx, lookupKey); err == nil {
			people = p
		}
	}()

	if summary.IDs.TMDB > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			artRes, artErr = s.fanartClient.GetMovieArtwork(ctx, summary.IDs.TMDB)
		}()
	}

	wg.Wait()

	movie := mapTraktMovie(summary)
	movie.Credits = mapTraktCredits(people)

	if summary.IDs.TMDB > 0 && artErr == nil {
		movie.Artwork = mapMovieArtwork(artRes)
	} else if cached != nil {
		movie.Artwork = cached.Artwork
	}
	movie.Artwork = applyTraktArtworkFallback(movie.Artwork, summary.Images)

	return s.repo.UpsertByTraktID(ctx, &movie)
}

func (s *MovieService) BatchForceSyncMovies(
	ctx context.Context,
	ids []string,
) (dto.BatchSyncResponse, error) {
	cleaned, err := prepareBatchIDs(ids, s.batchSyncLimit)
	if err != nil {
		return dto.BatchSyncResponse{}, err
	}

	results := make([]dto.BatchSyncItemResult, len(cleaned))

	sem := make(chan struct{}, 3)
	var wg sync.WaitGroup

	for i, rawID := range cleaned {
		wg.Add(1)
		go func(idx int, idOrSlug string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			movie, err := s.ForceSyncMovie(ctx, idOrSlug)
			if err != nil {
				results[idx] = dto.BatchSyncItemResult{
					Input:   idOrSlug,
					Success: false,
					Error:   err.Error(),
				}
				return
			}

			results[idx] = dto.BatchSyncItemResult{
				Input:   idOrSlug,
				Success: true,
				Title:   movie.Title,
				Slug:    movie.IDs.Slug,
			}
		}(i, rawID)
	}

	wg.Wait()

	var synced, failed int
	for _, r := range results {
		if r.Success {
			synced++
		} else {
			failed++
		}
	}

	return dto.BatchSyncResponse{
		SyncedCount: synced,
		FailedCount: failed,
		Results:     results,
	}, nil
}

// AdminSearchMovies searches local MongoDB first when source == "local",
// or searches Trakt and annotates each result with its current DB cache & staleness status.
func (s *MovieService) AdminSearchMovies(
	ctx context.Context,
	query, source string,
	page, limit int,
) ([]dto.AdminMovieSearchItem, dto.PaginationResponse, error) {
	page, limit = normalizePagination(page, limit)
	q := strings.TrimSpace(query)

	if strings.EqualFold(source, "local") {
		local, total, err := s.repo.SearchLocal(ctx, q, page, limit)
		if err != nil {
			return nil, dto.PaginationResponse{}, err
		}

		items := make([]dto.AdminMovieSearchItem, len(local))
		for i, m := range local {
			items[i] = dto.AdminMovieSearchItem{
				Movie:   m,
				InDB:    true,
				IsStale: !s.isFresh(&m),
			}
		}

		totalPages := int((total + int64(limit) - 1) / int64(limit))
		return items, dto.PaginationResponse{
			Page:       page,
			Limit:      limit,
			TotalPages: totalPages,
			TotalItems: int(total),
		}, nil
	}

	// Default: search Trakt without overwriting existing cached records,
	// so the admin can see true DB freshness and choose which ones to sync.
	rawResults, meta, err := s.traktClient.SearchMovies(ctx, q, page, limit)
	if err != nil {
		return nil, dto.PaginationResponse{}, err
	}

	items := make([]dto.AdminMovieSearchItem, len(rawResults))
	for i, r := range rawResults {
		cached, cacheErr := s.repo.FindByTraktID(ctx, r.Movie.IDs.Trakt)
		if cacheErr == nil && cached != nil {
			items[i] = dto.AdminMovieSearchItem{
				Movie:   *cached,
				InDB:    true,
				IsStale: !s.isFresh(cached) || !s.hasFullDetails(cached),
			}
		} else {
			items[i] = dto.AdminMovieSearchItem{
				Movie:   mapTraktMovie(r.Movie),
				InDB:    false,
				IsStale: true,
			}
		}
	}

	return items, dto.PaginationResponse{
		Page:       maxInt(meta.Page, page),
		Limit:      maxInt(meta.Limit, limit),
		TotalPages: meta.TotalPages,
		TotalItems: meta.TotalItems,
	}, nil
}
