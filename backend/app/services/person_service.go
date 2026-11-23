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
	movies := mapMovieCredits(mc)
	shows := mapShowCredits(sc)

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
			KnownForDepartments: inferDepartments(movies, shows),
		},
		MovieCredits: movies,
		ShowCredits:  shows,
	}
}

func mapMovieCredits(mc *trakt.PersonMovieCredits) dto.PersonMovieCreditsGroup {
	out := dto.PersonMovieCreditsGroup{
		Acting:      []dto.PersonMovieCreditItem{},
		Departments: make(map[string][]dto.PersonMovieCreditItem),
	}
	if mc == nil {
		return out
	}

	for _, c := range mc.Cast {
		out.Acting = append(out.Acting, dto.PersonMovieCreditItem{
			Role:     formatRole(c.Character, c.Characters),
			Title:    c.Movie.Title,
			Year:     c.Movie.Year,
			Rating:   c.Movie.Rating,
			Votes:    c.Movie.Votes,
			Overview: c.Movie.Overview,
			Genres:   c.Movie.Genres,
			Poster:   firstNormalizedTraktURL(c.Movie.Images.Poster),
			IDs:      mapIDs(c.Movie.IDs),
		})
	}
	sortCredits(out.Acting, func(i dto.PersonMovieCreditItem) (int, int) { return i.Year, i.Votes })

	for dept, items := range mc.Crew {
		mapped := make([]dto.PersonMovieCreditItem, 0, len(items))
		for _, c := range items {
			mapped = append(mapped, dto.PersonMovieCreditItem{
				Jobs:     normalizeJobs(c.Job, c.Jobs),
				Title:    c.Movie.Title,
				Year:     c.Movie.Year,
				Rating:   c.Movie.Rating,
				Votes:    c.Movie.Votes,
				Overview: c.Movie.Overview,
				Genres:   c.Movie.Genres,
				Poster:   firstNormalizedTraktURL(c.Movie.Images.Poster),
				IDs:      mapIDs(c.Movie.IDs),
			})
		}
		sortCredits(mapped, func(i dto.PersonMovieCreditItem) (int, int) { return i.Year, i.Votes })
		out.Departments[dept] = mapped
	}

	return out
}

func mapShowCredits(sc *trakt.PersonShowCredits) dto.PersonShowCreditsGroup {
	out := dto.PersonShowCreditsGroup{
		Acting:      []dto.PersonShowCreditItem{},
		Departments: make(map[string][]dto.PersonShowCreditItem),
	}
	if sc == nil {
		return out
	}

	for _, c := range sc.Cast {
		out.Acting = append(out.Acting, dto.PersonShowCreditItem{
			Role:         formatRole(c.Character, c.Characters),
			EpisodeCount: c.EpisodeCount,
			Title:        c.Show.Title,
			Year:         c.Show.Year,
			Rating:       c.Show.Rating,
			Votes:        c.Show.Votes,
			Status:       c.Show.Status,
			Genres:       c.Show.Genres,
			Poster:       firstNormalizedTraktURL(c.Show.Images.Poster),
			IDs:          mapIDs(c.Show.IDs),
		})
	}
	sortCredits(out.Acting, func(i dto.PersonShowCreditItem) (int, int) { return i.Year, i.Votes })

	for dept, items := range sc.Crew {
		mapped := make([]dto.PersonShowCreditItem, 0, len(items))
		for _, c := range items {
			mapped = append(mapped, dto.PersonShowCreditItem{
				Jobs:         normalizeJobs(c.Job, c.Jobs),
				EpisodeCount: c.EpisodeCount,
				Title:        c.Show.Title,
				Year:         c.Show.Year,
				Rating:       c.Show.Rating,
				Votes:        c.Show.Votes,
				Status:       c.Show.Status,
				Genres:       c.Show.Genres,
				Poster:       firstNormalizedTraktURL(c.Show.Images.Poster),
				IDs:          mapIDs(c.Show.IDs),
			})
		}
		sortCredits(mapped, func(i dto.PersonShowCreditItem) (int, int) { return i.Year, i.Votes })
		out.Departments[dept] = mapped
	}

	return out
}

func sortCredits[T any](items []T, key func(T) (year int, votes int)) {
	sort.SliceStable(items, func(i, j int) bool {
		y1, v1 := key(items[i])
		y2, v2 := key(items[j])
		if y1 != y2 {
			return y1 > y2
		}
		return v1 > v2
	})
}

func formatRole(primary string, all []string) string {
	if len(all) > 0 {
		return strings.Join(all, " / ")
	}
	return primary
}

func normalizeJobs(primary string, all []string) []string {
	if len(all) > 0 {
		return all
	}
	if primary != "" {
		return []string{primary}
	}
	return []string{}
}

func mapIDs(ids trakt.IDs) dto.PersonIDsResponse {
	return dto.PersonIDsResponse{
		Trakt: ids.Trakt,
		Slug:  ids.Slug,
		IMDB:  ids.IMDB,
	}
}

func inferDepartments(m dto.PersonMovieCreditsGroup, s dto.PersonShowCreditsGroup) []string {
	totals := make(map[string]int)

	if actingCount := len(m.Acting) + len(s.Acting); actingCount > 0 {
		totals["Acting"] = actingCount
	}

	for dept, items := range m.Departments {
		if len(items) > 0 {
			totals[formatDepartmentLabel(dept)] += len(items)
		}
	}

	for dept, items := range s.Departments {
		if len(items) > 0 {
			totals[formatDepartmentLabel(dept)] += len(items)
		}
	}

	type deptCount struct {
		name  string
		count int
	}

	counts := make([]deptCount, 0, len(totals))
	for name, count := range totals {
		counts = append(counts, deptCount{name: name, count: count})
	}

	sort.SliceStable(counts, func(i, j int) bool {
		if counts[i].count != counts[j].count {
			return counts[i].count > counts[j].count
		}
		return counts[i].name < counts[j].name
	})

	res := make([]string, 0, len(counts))
	for _, d := range counts {
		res = append(res, d.name)
	}
	return res
}

func formatDepartmentLabel(raw string) string {
	cleaned := strings.TrimSpace(raw)
	if cleaned == "" {
		return "Crew"
	}
	words := strings.Fields(strings.ReplaceAll(cleaned, "-", " "))
	for i, w := range words {
		words[i] = strings.ToUpper(w[:1]) + strings.ToLower(w[1:])
	}
	return strings.Join(words, " ")
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

func (s *PersonService) SearchPeople(
	ctx context.Context,
	query string,
	page, limit int,
) (*dto.PersonSearchResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	rawResults, meta, err := s.traktClient.SearchPeople(ctx, query, page, limit)
	if err != nil {
		return nil, err
	}

	items := make([]dto.PersonSearchItem, 0, len(rawResults))
	for _, r := range rawResults {
		items = append(items, dto.PersonSearchItem{
			Score: r.Score,
			Name:  r.Person.Name,
			IDs: dto.PersonIDsResponse{
				Trakt: r.Person.IDs.Trakt,
				Slug:  r.Person.IDs.Slug,
				IMDB:  r.Person.IDs.IMDB,
			},
			Biography:  r.Person.Biography,
			Birthday:   r.Person.Birthday,
			Birthplace: r.Person.Birthplace,
			Images: dto.PersonImagesResponse{
				Headshot: firstNormalizedTraktURL(r.Person.Images.Headshot),
				Fanart:   firstNormalizedTraktURL(r.Person.Images.Fanart),
			},
		})
	}

	return &dto.PersonSearchResponse{
		Results: items,
		Pagination: dto.PersonPaginationMeta{
			Page:       meta.Page,
			Limit:      meta.Limit,
			TotalPages: meta.TotalPages,
			TotalItems: meta.TotalItems,
		},
	}, nil
}
