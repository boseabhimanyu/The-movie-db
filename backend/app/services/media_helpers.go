package services

import (
	"fmt"
	"movie-app/apperrors"
	"movie-app/integrations/trakt"
	"movie-app/models"
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
