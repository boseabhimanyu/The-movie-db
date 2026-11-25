package services

import (
	"fmt"
	"movie-app/apperrors"
	"movie-app/dto"
	"movie-app/integrations/trakt"
	"movie-app/models"
	"movie-app/repository"
	"strings"
)

func prepareBatchIDs(ids []string, maxLimit int) ([]string, error) {
	seen := make(map[string]struct{}, len(ids))
	cleaned := make([]string, 0, len(ids))

	for _, id := range ids {
		trimmed := strings.TrimSpace(id)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		cleaned = append(cleaned, trimmed)
	}

	if len(cleaned) == 0 {
		return nil, fmt.Errorf("%w: at least 1 valid id or slug is required", apperrors.ErrInvalidBatchSync)
	}

	if len(cleaned) > maxLimit {
		return nil, fmt.Errorf("%w: cannot sync more than %d items per request", apperrors.ErrInvalidBatchSync, maxLimit)
	}

	return cleaned, nil
}

func applyTraktArtworkFallback(
	art models.MediaArtwork,
	traktImgs trakt.TraktMediaImages,
) models.MediaArtwork {
	if art.Poster == "" {
		art.Poster = firstNormalizedTraktURL(traktImgs.Poster)
	}
	if art.Backdrop == "" {
		art.Backdrop = firstNormalizedTraktURL(traktImgs.Fanart)
	}
	if art.Logo == "" {
		art.Logo = firstNormalizedTraktURL(traktImgs.Logo)
	}
	if art.Banner == "" {
		art.Banner = firstNormalizedTraktURL(traktImgs.Banner)
	}
	if art.Thumb == "" {
		art.Thumb = firstNormalizedTraktURL(traktImgs.Thumb)
	}
	if len(art.Posters) == 0 && art.Poster != "" {
		art.Posters = []string{art.Poster}
	}
	if len(art.Backdrops) == 0 && art.Backdrop != "" {
		art.Backdrops = []string{art.Backdrop}
	}
	return art
}

func paginateSearchItems(allItems []dto.PersonSearchItem, page, limit int) *dto.PersonSearchResponse {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}

	totalItems := len(allItems)
	totalPages := 0
	if totalItems > 0 {
		totalPages = (totalItems + limit - 1) / limit
	}

	start := (page - 1) * limit
	if start >= totalItems {
		return &dto.PersonSearchResponse{
			Results: []dto.PersonSearchItem{},
			Pagination: dto.PersonPaginationMeta{
				Page:       page,
				Limit:      limit,
				TotalPages: totalPages,
				TotalItems: totalItems,
			},
		}
	}

	end := start + limit
	if end > totalItems {
		end = totalItems
	}

	return &dto.PersonSearchResponse{
		Results: allItems[start:end],
		Pagination: dto.PersonPaginationMeta{
			Page:       page,
			Limit:      limit,
			TotalPages: totalPages,
			TotalItems: totalItems,
		},
	}
}

func matchesMediaFilters(
	genres []string,
	year int,
	rating float64,
	country string,
	status string,
	f repository.MediaSearchFilters,
) bool {
	if g := strings.ToLower(strings.TrimSpace(f.Genre)); g != "" {
		found := false
		for _, item := range genres {
			if strings.EqualFold(strings.TrimSpace(item), g) {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	if minY, maxY, ok := repository.ParseYearRange(f.Year); ok {
		if year < minY || year > maxY {
			return false
		}
	}

	if f.MinRating > 0 && rating < f.MinRating {
		return false
	}

	if c := strings.ToLower(strings.TrimSpace(f.Country)); c != "" {
		if !strings.EqualFold(strings.TrimSpace(country), c) {
			return false
		}
	}

	if st := strings.ToLower(strings.TrimSpace(f.Status)); st != "" {
		if !strings.EqualFold(strings.TrimSpace(status), st) {
			return false
		}
	}

	return true
}

func paginateSlice[T any](items []T, page, limit int) ([]T, int, int) {
	totalItems := len(items)
	if totalItems == 0 {
		return []T{}, 0, 0
	}

	totalPages := (totalItems + limit - 1) / limit
	start := (page - 1) * limit
	if start >= totalItems {
		return []T{}, totalItems, totalPages
	}

	end := start + limit
	if end > totalItems {
		end = totalItems
	}

	return items[start:end], totalItems, totalPages
}
