package services

import (
	"fmt"
	"movie-app/apperrors"
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
