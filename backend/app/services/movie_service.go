package services

import (
	"context"
	"errors"
	"movie-app/config"
	"movie-app/dto"
	"movie-app/integrations/fanart"
	"movie-app/integrations/trakt"
	"movie-app/models"
	"movie-app/repository"
	mongorepo "movie-app/repository/mongo"
	"strings"
	"sync"
	"time"
)

type MovieService struct {
	repo         repository.MovieRepository
	traktClient  *trakt.Client
	fanartClient *fanart.Client
	cacheTTL     time.Duration
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

	return &MovieService{
		repo:         repo,
		traktClient:  traktClient,
		fanartClient: fanartClient,
		cacheTTL:     time.Duration(ttlHours) * time.Hour,
	}
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
	if err == nil && s.isFresh(cached) && s.hasFullDetails(cached) {
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

	return s.repo.UpsertByTraktID(ctx, &movie)
}

func (s *MovieService) GetTrendingMovies(
	ctx context.Context,
	page, limit int,
) (dto.TrendingMoviesResponse, error) {
	page, limit = normalizePagination(page, limit)

	items, meta, err := s.traktClient.GetTrendingMovies(ctx, page, limit)
	if err != nil {
		return dto.TrendingMoviesResponse{}, err
	}

	rawMovies := make([]trakt.Movie, len(items))
	for i, item := range items {
		rawMovies[i] = item.Movie
	}

	stitched := s.stitchAndCacheMovies(ctx, rawMovies)

	results := make([]dto.TrendingMovieResult, len(stitched))
	for i, m := range stitched {
		results[i] = dto.TrendingMovieResult{
			Watchers: items[i].Watchers,
			Movie:    m,
		}
	}

	return dto.TrendingMoviesResponse{
		Results: results,
		Pagination: dto.PaginationResponse{
			Page:       maxInt(meta.Page, page),
			Limit:      maxInt(meta.Limit, limit),
			TotalPages: meta.TotalPages,
			TotalItems: meta.TotalItems,
		},
	}, nil
}

func (s *MovieService) GetPopularMovies(
	ctx context.Context,
	page, limit int,
) (dto.MovieListResponse, error) {
	page, limit = normalizePagination(page, limit)

	rawMovies, meta, err := s.traktClient.GetPopularMovies(ctx, page, limit)
	if err != nil {
		return dto.MovieListResponse{}, err
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
			} else if tm.IDs.TMDB > 0 {
				if artRes, artErr := s.fanartClient.GetMovieArtwork(ctx, tm.IDs.TMDB); artErr == nil {
					movie.Artwork = mapMovieArtwork(artRes)
				} else if cached != nil {
					movie.Artwork = cached.Artwork
				}
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
			Characters: c.Characters,
			IDs:        mapExternalIDs(c.Person.IDs),
		})
	}

	directors := make([]models.CrewMember, 0, len(people.Crew.Directing))
	for _, d := range people.Crew.Directing {
		directors = append(directors, models.CrewMember{
			TraktID: d.Person.IDs.Trakt,
			Name:    d.Person.Name,
			Slug:    d.Person.IDs.Slug,
			Jobs:    d.Jobs,
			IDs:     mapExternalIDs(d.Person.IDs),
		})
	}

	writers := make([]models.CrewMember, 0, len(people.Crew.Writing))
	for _, w := range people.Crew.Writing {
		writers = append(writers, models.CrewMember{
			TraktID: w.Person.IDs.Trakt,
			Name:    w.Person.Name,
			Slug:    w.Person.IDs.Slug,
			Jobs:    w.Jobs,
			IDs:     mapExternalIDs(w.Person.IDs),
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
	return errors.Is(err, mongorepo.ErrMediaNotFound) ||
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

	return s.repo.UpsertByTraktID(ctx, &movie)
}
