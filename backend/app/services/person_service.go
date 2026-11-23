package services

import (
	"context"
	"errors"
	"movie-app/apperrors"
	"movie-app/config"
	"movie-app/dto"
	"movie-app/integrations/trakt"
	"movie-app/models"
	"movie-app/repository"
	"sort"
	"strings"
	"sync"
	"time"
)

type PersonService struct {
	traktClient *trakt.Client
	personRepo  repository.PersonRepository
	staleTTL    time.Duration
}

func NewPersonService(
	traktClient *trakt.Client,
	personRepo repository.PersonRepository,
	cfg config.Config,
) *PersonService {
	ttlHours := cfg.PersonCacheTTLHours
	if ttlHours <= 0 {
		ttlHours = 168
	}

	return &PersonService{
		traktClient: traktClient,
		personRepo:  personRepo,
		staleTTL:    time.Duration(ttlHours) * time.Hour,
	}
}

func (s *PersonService) GetPersonDetails(ctx context.Context, idOrSlug string) (*dto.PersonDetailResponse, error) {
	existing, err := s.personRepo.FindByIDOrSlug(ctx, idOrSlug)
	if err != nil && !errors.Is(err, apperrors.ErrMediaNotFound) {
		return nil, err
	}

	if existing != nil && time.Since(existing.SyncedAt) < s.staleTTL {
		return s.buildEnrichedPersonResponse(ctx, existing), nil
	}

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
		if existing != nil {
			return s.buildEnrichedPersonResponse(ctx, existing), nil
		}
		return nil, profileErr
	}
	if errors.Is(movieErr, trakt.ErrRateLimited) || errors.Is(showErr, trakt.ErrRateLimited) {
		if existing != nil {
			return s.buildEnrichedPersonResponse(ctx, existing), nil
		}
		return nil, trakt.ErrRateLimited
	}

	personModel := mapTraktToPersonModel(profile, movieCredits, showCredits)
	saved, err := s.personRepo.UpsertByTraktID(ctx, personModel)
	if err != nil {
		return s.buildEnrichedPersonResponse(ctx, personModel), nil
	}

	return s.buildEnrichedPersonResponse(ctx, saved), nil
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
			Score:      r.Score,
			Name:       r.Person.Name,
			IDs:        mapTraktIDsToDTO(r.Person.IDs),
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

func (s *PersonService) buildEnrichedPersonResponse(
	ctx context.Context,
	p *models.Person,
) *dto.PersonDetailResponse {
	movieIDs := collectMovieTraktIDs(p.MovieCredits)
	showIDs := collectShowTraktIDs(p.ShowCredits)

	localMoviePosters, _ := s.personRepo.FindLocalMoviePostersByTraktIDs(ctx, movieIDs)
	localShowPosters, _ := s.personRepo.FindLocalShowPostersByTraktIDs(ctx, showIDs)

	movies := dto.PersonMovieCreditsGroup{
		Acting:      mapMovieCreditModelsToDTO(p.MovieCredits.Acting, localMoviePosters),
		Departments: make(map[string][]dto.PersonMovieCreditItem, len(p.MovieCredits.Departments)),
	}
	for dept, items := range p.MovieCredits.Departments {
		movies.Departments[dept] = mapMovieCreditModelsToDTO(items, localMoviePosters)
	}

	shows := dto.PersonShowCreditsGroup{
		Acting:      mapShowCreditModelsToDTO(p.ShowCredits.Acting, localShowPosters),
		Departments: make(map[string][]dto.PersonShowCreditItem, len(p.ShowCredits.Departments)),
	}
	for dept, items := range p.ShowCredits.Departments {
		shows.Departments[dept] = mapShowCreditModelsToDTO(items, localShowPosters)
	}

	return &dto.PersonDetailResponse{
		Person: dto.PersonProfileResponse{
			Name:       p.Name,
			IDs:        mapModelIDsToDTO(p.IDs),
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
				Headshot: p.Images.Headshot,
				Fanart:   p.Images.Fanart,
			},
			KnownForDepartments: p.KnownForDepartments,
		},
		MovieCredits: movies,
		ShowCredits:  shows,
	}
}

func mapTraktToPersonModel(
	p *trakt.PersonProfile,
	mc *trakt.PersonMovieCredits,
	sc *trakt.PersonShowCredits,
) *models.Person {
	movies := mapTraktMovieCreditsToModel(mc)
	shows := mapTraktShowCreditsToModel(sc)

	return &models.Person{
		Name:       p.Name,
		IDs:        mapTraktIDsToModel(p.IDs),
		Biography:  p.Biography,
		Birthday:   p.Birthday,
		Death:      p.Death,
		Birthplace: p.Birthplace,
		Homepage:   p.Homepage,
		SocialIDs: models.PersonSocialIDs{
			Twitter:   p.SocialIDs.Twitter,
			Facebook:  p.SocialIDs.Facebook,
			Instagram: p.SocialIDs.Instagram,
			Wikipedia: p.SocialIDs.Wikipedia,
		},
		Images: models.PersonImages{
			Headshot: firstNormalizedTraktURL(p.Images.Headshot),
			Fanart:   firstNormalizedTraktURL(p.Images.Fanart),
		},
		KnownForDepartments: inferDepartments(movies, shows),
		MovieCredits:        movies,
		ShowCredits:         shows,
	}
}

func mapTraktMovieCreditsToModel(mc *trakt.PersonMovieCredits) models.PersonMovieCredits {
	out := models.PersonMovieCredits{
		Acting:      []models.PersonMovieCredit{},
		Departments: make(map[string][]models.PersonMovieCredit),
	}
	if mc == nil {
		return out
	}

	for _, c := range mc.Cast {
		out.Acting = append(out.Acting, models.PersonMovieCredit{
			Role:     formatRole(c.Character, c.Characters),
			Title:    c.Movie.Title,
			Year:     c.Movie.Year,
			Rating:   c.Movie.Rating,
			Votes:    c.Movie.Votes,
			Overview: c.Movie.Overview,
			Genres:   c.Movie.Genres,
			Poster:   firstNormalizedTraktURL(c.Movie.Images.Poster),
			IDs:      mapTraktIDsToModel(c.Movie.IDs),
		})
	}
	sortCredits(out.Acting, func(i models.PersonMovieCredit) (int, int) { return i.Year, i.Votes })

	for dept, items := range mc.Crew {
		mapped := make([]models.PersonMovieCredit, 0, len(items))
		for _, c := range items {
			mapped = append(mapped, models.PersonMovieCredit{
				Jobs:     normalizeJobs(c.Job, c.Jobs),
				Title:    c.Movie.Title,
				Year:     c.Movie.Year,
				Rating:   c.Movie.Rating,
				Votes:    c.Movie.Votes,
				Overview: c.Movie.Overview,
				Genres:   c.Movie.Genres,
				Poster:   firstNormalizedTraktURL(c.Movie.Images.Poster),
				IDs:      mapTraktIDsToModel(c.Movie.IDs),
			})
		}
		sortCredits(mapped, func(i models.PersonMovieCredit) (int, int) { return i.Year, i.Votes })
		out.Departments[dept] = mapped
	}

	return out
}

func mapTraktShowCreditsToModel(sc *trakt.PersonShowCredits) models.PersonShowCredits {
	out := models.PersonShowCredits{
		Acting:      []models.PersonShowCredit{},
		Departments: make(map[string][]models.PersonShowCredit),
	}
	if sc == nil {
		return out
	}

	for _, c := range sc.Cast {
		out.Acting = append(out.Acting, models.PersonShowCredit{
			Role:         formatRole(c.Character, c.Characters),
			EpisodeCount: c.EpisodeCount,
			Title:        c.Show.Title,
			Year:         c.Show.Year,
			Rating:       c.Show.Rating,
			Votes:        c.Show.Votes,
			Status:       c.Show.Status,
			Genres:       c.Show.Genres,
			Poster:       firstNormalizedTraktURL(c.Show.Images.Poster),
			IDs:          mapTraktIDsToModel(c.Show.IDs),
		})
	}
	sortCredits(out.Acting, func(i models.PersonShowCredit) (int, int) { return i.Year, i.Votes })

	for dept, items := range sc.Crew {
		mapped := make([]models.PersonShowCredit, 0, len(items))
		for _, c := range items {
			mapped = append(mapped, models.PersonShowCredit{
				Jobs:         normalizeJobs(c.Job, c.Jobs),
				EpisodeCount: c.EpisodeCount,
				Title:        c.Show.Title,
				Year:         c.Show.Year,
				Rating:       c.Show.Rating,
				Votes:        c.Show.Votes,
				Status:       c.Show.Status,
				Genres:       c.Show.Genres,
				Poster:       firstNormalizedTraktURL(c.Show.Images.Poster),
				IDs:          mapTraktIDsToModel(c.Show.IDs),
			})
		}
		sortCredits(mapped, func(i models.PersonShowCredit) (int, int) { return i.Year, i.Votes })
		out.Departments[dept] = mapped
	}

	return out
}

func mapMovieCreditModelsToDTO(
	items []models.PersonMovieCredit,
	localPosters map[int]string,
) []dto.PersonMovieCreditItem {
	out := make([]dto.PersonMovieCreditItem, 0, len(items))
	for _, c := range items {
		poster := c.Poster
		if localPoster, ok := localPosters[c.IDs.Trakt]; ok && localPoster != "" {
			poster = localPoster
		}
		out = append(out, dto.PersonMovieCreditItem{
			Role:     c.Role,
			Jobs:     c.Jobs,
			Title:    c.Title,
			Year:     c.Year,
			Rating:   c.Rating,
			Votes:    c.Votes,
			Overview: c.Overview,
			Genres:   c.Genres,
			Poster:   poster,
			IDs:      mapModelIDsToDTO(c.IDs),
		})
	}
	return out
}

func mapShowCreditModelsToDTO(
	items []models.PersonShowCredit,
	localPosters map[int]string,
) []dto.PersonShowCreditItem {
	out := make([]dto.PersonShowCreditItem, 0, len(items))
	for _, c := range items {
		poster := c.Poster
		if localPoster, ok := localPosters[c.IDs.Trakt]; ok && localPoster != "" {
			poster = localPoster
		}
		out = append(out, dto.PersonShowCreditItem{
			Role:         c.Role,
			Jobs:         c.Jobs,
			EpisodeCount: c.EpisodeCount,
			Title:        c.Title,
			Year:         c.Year,
			Rating:       c.Rating,
			Votes:        c.Votes,
			Status:       c.Status,
			Genres:       c.Genres,
			Poster:       poster,
			IDs:          mapModelIDsToDTO(c.IDs),
		})
	}
	return out
}

func collectMovieTraktIDs(mc models.PersonMovieCredits) []int {
	seen := make(map[int]struct{})
	for _, c := range mc.Acting {
		if c.IDs.Trakt > 0 {
			seen[c.IDs.Trakt] = struct{}{}
		}
	}
	for _, items := range mc.Departments {
		for _, c := range items {
			if c.IDs.Trakt > 0 {
				seen[c.IDs.Trakt] = struct{}{}
			}
		}
	}
	ids := make([]int, 0, len(seen))
	for id := range seen {
		ids = append(ids, id)
	}
	return ids
}

func collectShowTraktIDs(sc models.PersonShowCredits) []int {
	seen := make(map[int]struct{})
	for _, c := range sc.Acting {
		if c.IDs.Trakt > 0 {
			seen[c.IDs.Trakt] = struct{}{}
		}
	}
	for _, items := range sc.Departments {
		for _, c := range items {
			if c.IDs.Trakt > 0 {
				seen[c.IDs.Trakt] = struct{}{}
			}
		}
	}
	ids := make([]int, 0, len(seen))
	for id := range seen {
		ids = append(ids, id)
	}
	return ids
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

func mapTraktIDsToModel(ids trakt.IDs) models.PersonIDs {
	return models.PersonIDs{
		Trakt: ids.Trakt,
		Slug:  ids.Slug,
		IMDB:  ids.IMDB,
	}
}

func mapTraktIDsToDTO(ids trakt.IDs) dto.PersonIDsResponse {
	return dto.PersonIDsResponse{
		Trakt: ids.Trakt,
		Slug:  ids.Slug,
		IMDB:  ids.IMDB,
	}
}

func mapModelIDsToDTO(ids models.PersonIDs) dto.PersonIDsResponse {
	return dto.PersonIDsResponse{
		Trakt: ids.Trakt,
		Slug:  ids.Slug,
		IMDB:  ids.IMDB,
	}
}

func inferDepartments(m models.PersonMovieCredits, s models.PersonShowCredits) []string {
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
