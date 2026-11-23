package services

import (
	"context"
	"errors"
	"movie-app/dto"
	"movie-app/integrations/trakt"
	"sort"
	"strings"
	"sync"
	"time"
)

type personCacheEntry struct {
	data      *dto.PersonDetailResponse
	expiresAt time.Time
}

type PersonService struct {
	traktClient *trakt.Client
	cacheTTL    time.Duration
	mu          sync.RWMutex
	cache       map[string]personCacheEntry
}

func NewPersonService(traktClient *trakt.Client) *PersonService {
	return &PersonService{
		traktClient: traktClient,
		cacheTTL:    12 * time.Hour,
		cache:       make(map[string]personCacheEntry),
	}
}

func (s *PersonService) GetPersonDetails(ctx context.Context, idOrSlug string) (*dto.PersonDetailResponse, error) {
	key := strings.ToLower(strings.TrimSpace(idOrSlug))

	s.mu.RLock()
	if entry, ok := s.cache[key]; ok && time.Now().Before(entry.expiresAt) {
		s.mu.RUnlock()
		return entry.data, nil
	}
	s.mu.RUnlock()

	var (
		wg           sync.WaitGroup
		profile      *trakt.PersonProfile
		movieCredits *trakt.PersonMovieCredits
		showCredits  *trakt.PersonShowCredits

		profileErr error
		movieErr   error
		showErr    error
	)

	wg.Add(3)
	go func() {
		defer wg.Done()
		profile, profileErr = s.traktClient.GetPerson(ctx, idOrSlug)
	}()
	go func() {
		defer wg.Done()
		movieCredits, movieErr = s.traktClient.GetPersonMovies(ctx, idOrSlug)
	}()
	go func() {
		defer wg.Done()
		showCredits, showErr = s.traktClient.GetPersonShows(ctx, idOrSlug)
	}()
	wg.Wait()

	if profileErr != nil {
		return nil, profileErr
	}
	if errors.Is(movieErr, trakt.ErrRateLimited) || errors.Is(showErr, trakt.ErrRateLimited) {
		return nil, trakt.ErrRateLimited
	}

	resp := mapPersonDetailResponse(profile, movieCredits, showCredits)

	s.mu.Lock()
	s.cache[key] = personCacheEntry{
		data:      resp,
		expiresAt: time.Now().Add(s.cacheTTL),
	}
	if slugKey := strings.ToLower(strings.TrimSpace(profile.IDs.Slug)); slugKey != "" && slugKey != key {
		s.cache[slugKey] = personCacheEntry{
			data:      resp,
			expiresAt: time.Now().Add(s.cacheTTL),
		}
	}
	s.mu.Unlock()

	return resp, nil
}

func mapPersonDetailResponse(
	p *trakt.PersonProfile,
	mc *trakt.PersonMovieCredits,
	sc *trakt.PersonShowCredits,
) *dto.PersonDetailResponse {
	movies := dto.PersonMovieCreditsGroup{
		Directing:  []dto.PersonMovieCreditItem{},
		Writing:    []dto.PersonMovieCreditItem{},
		Acting:     []dto.PersonMovieCreditItem{},
		Production: []dto.PersonMovieCreditItem{},
	}

	if mc != nil {
		for _, c := range mc.Cast {
			role := c.Character
			if len(c.Characters) > 0 {
				role = strings.Join(c.Characters, " / ")
			}
			movies.Acting = append(movies.Acting, dto.PersonMovieCreditItem{
				Role:     role,
				Title:    c.Movie.Title,
				Year:     c.Movie.Year,
				Rating:   c.Movie.Rating,
				Votes:    c.Movie.Votes,
				Overview: c.Movie.Overview,
				Genres:   c.Movie.Genres,
				Poster:   firstNormalizedTraktURL(c.Movie.Images.Poster),
				IDs: dto.PersonIDsResponse{
					Trakt: c.Movie.IDs.Trakt,
					Slug:  c.Movie.IDs.Slug,
					IMDB:  c.Movie.IDs.IMDB,
				},
			})
		}

		movies.Directing = mapMovieCrewDepartment(mc.Crew["directing"])
		movies.Writing = mapMovieCrewDepartment(mc.Crew["writing"])
		movies.Production = mapMovieCrewDepartment(mc.Crew["production"])
	}

	shows := dto.PersonShowCreditsGroup{
		Directing:  []dto.PersonShowCreditItem{},
		Writing:    []dto.PersonShowCreditItem{},
		Acting:     []dto.PersonShowCreditItem{},
		Production: []dto.PersonShowCreditItem{},
	}

	if sc != nil {
		for _, c := range sc.Cast {
			role := c.Character
			if len(c.Characters) > 0 {
				role = strings.Join(c.Characters, " / ")
			}
			shows.Acting = append(shows.Acting, dto.PersonShowCreditItem{
				Role:         role,
				EpisodeCount: c.EpisodeCount,
				Title:        c.Show.Title,
				Year:         c.Show.Year,
				Rating:       c.Show.Rating,
				Votes:        c.Show.Votes,
				Status:       c.Show.Status,
				Genres:       c.Show.Genres,
				Poster:       firstNormalizedTraktURL(c.Show.Images.Poster),
				IDs: dto.PersonIDsResponse{
					Trakt: c.Show.IDs.Trakt,
					Slug:  c.Show.IDs.Slug,
					IMDB:  c.Show.IDs.IMDB,
				},
			})
		}

		shows.Directing = mapShowCrewDepartment(sc.Crew["directing"])
		shows.Writing = mapShowCrewDepartment(sc.Crew["writing"])
		shows.Production = mapShowCrewDepartment(sc.Crew["production"])
	}

	sortMovieCredits(movies.Directing)
	sortMovieCredits(movies.Writing)
	sortMovieCredits(movies.Acting)
	sortMovieCredits(movies.Production)

	sortShowCredits(shows.Directing)
	sortShowCredits(shows.Writing)
	sortShowCredits(shows.Acting)
	sortShowCredits(shows.Production)

	departments := inferDepartments(movies, shows)

	return &dto.PersonDetailResponse{
		Person: dto.PersonProfileResponse{
			Name: p.Name,
			IDs: dto.PersonIDsResponse{
				Trakt: p.IDs.Trakt,
				Slug:  p.IDs.Slug,
				IMDB:  p.IDs.IMDB,
			},
			Biography:  p.Biography,
			Birthday:   p.Birthday,
			Death:      p.Death,
			Birthplace: p.Birthplace,
			Homepage:   p.Homepage,
			SocialIDs: dto.PersonSocialResponse{
				Twitter:   p.SocialIDs.Twitter,
				Facebook:  p.SocialIDs.Facebook,
				Instagram: p.SocialIDs.Instagram,
				Wikipedia: p.SocialIDs.Wikipedia,
			},
			Images: dto.PersonImagesResponse{
				Headshot: firstNormalizedTraktURL(p.Images.Headshot),
				Fanart:   firstNormalizedTraktURL(p.Images.Fanart),
			},
			KnownForDepartments: departments,
		},
		MovieCredits: movies,
		ShowCredits:  shows,
	}
}

func mapMovieCrewDepartment(items []trakt.PersonMovieCrewCredit) []dto.PersonMovieCreditItem {
	out := make([]dto.PersonMovieCreditItem, 0, len(items))
	for _, c := range items {
		jobs := c.Jobs
		if len(jobs) == 0 && c.Job != "" {
			jobs = []string{c.Job}
		}
		out = append(out, dto.PersonMovieCreditItem{
			Jobs:     jobs,
			Title:    c.Movie.Title,
			Year:     c.Movie.Year,
			Rating:   c.Movie.Rating,
			Votes:    c.Movie.Votes,
			Overview: c.Movie.Overview,
			Genres:   c.Movie.Genres,
			Poster:   firstNormalizedTraktURL(c.Movie.Images.Poster),
			IDs: dto.PersonIDsResponse{
				Trakt: c.Movie.IDs.Trakt,
				Slug:  c.Movie.IDs.Slug,
				IMDB:  c.Movie.IDs.IMDB,
			},
		})
	}
	return out
}

func mapShowCrewDepartment(items []trakt.PersonShowCrewCredit) []dto.PersonShowCreditItem {
	out := make([]dto.PersonShowCreditItem, 0, len(items))
	for _, c := range items {
		jobs := c.Jobs
		if len(jobs) == 0 && c.Job != "" {
			jobs = []string{c.Job}
		}
		out = append(out, dto.PersonShowCreditItem{
			Jobs:         jobs,
			EpisodeCount: c.EpisodeCount,
			Title:        c.Show.Title,
			Year:         c.Show.Year,
			Rating:       c.Show.Rating,
			Votes:        c.Show.Votes,
			Status:       c.Show.Status,
			Genres:       c.Show.Genres,
			Poster:       firstNormalizedTraktURL(c.Show.Images.Poster),
			IDs: dto.PersonIDsResponse{
				Trakt: c.Show.IDs.Trakt,
				Slug:  c.Show.IDs.Slug,
				IMDB:  c.Show.IDs.IMDB,
			},
		})
	}
	return out
}

func sortMovieCredits(items []dto.PersonMovieCreditItem) {
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Year != items[j].Year {
			return items[i].Year > items[j].Year
		}
		return items[i].Votes > items[j].Votes
	})
}

func sortShowCredits(items []dto.PersonShowCreditItem) {
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Year != items[j].Year {
			return items[i].Year > items[j].Year
		}
		return items[i].Votes > items[j].Votes
	})
}

func inferDepartments(m dto.PersonMovieCreditsGroup, s dto.PersonShowCreditsGroup) []string {
	type deptCount struct {
		name  string
		count int
	}
	counts := []deptCount{
		{name: "Acting", count: len(m.Acting) + len(s.Acting)},
		{name: "Directing", count: len(m.Directing) + len(s.Directing)},
		{name: "Writing", count: len(m.Writing) + len(s.Writing)},
		{name: "Production", count: len(m.Production) + len(s.Production)},
	}
	sort.SliceStable(counts, func(i, j int) bool {
		return counts[i].count > counts[j].count
	})

	var res []string
	for _, d := range counts {
		if d.count > 0 {
			res = append(res, d.name)
		}
	}
	return res
}

func firstNormalizedTraktURL(urls []string) string {
	for _, raw := range urls {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}
		if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
			return trimmed
		}
		return "https://" + strings.TrimPrefix(trimmed, "//")
	}
	return ""
}
