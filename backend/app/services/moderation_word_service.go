package services

import (
	"context"
	"fmt"
	"movie-app/apperrors"
	"movie-app/dto"
	"movie-app/models"
	"movie-app/repository"
	"movie-app/sanitizer"
	"slices"
	"strings"
	"unicode/utf8"
)

type ModerationWordService struct {
	repo repository.ModerationWordRepository
}

func NewModerationWordService(repo repository.ModerationWordRepository) *ModerationWordService {
	return &ModerationWordService{repo: repo}
}

func (s *ModerationWordService) ListWords(ctx context.Context) (*dto.ModerationWordsResponse, error) {
	blocked, allowed, err := s.repo.GetAllGrouped(ctx)
	if err != nil {
		return nil, err
	}
	return buildModerationWordsResponse(blocked, allowed), nil
}

func (s *ModerationWordService) AddWords(
	ctx context.Context,
	adminUserID string,
	req dto.AddModerationWordsRequest,
) (*dto.ModerationWordsResponse, error) {
	if req.Type != models.WordTypeBlocked && req.Type != models.WordTypeAllowed {
		return nil, fmt.Errorf("%w: type must be 'blocked' or 'allowed'", apperrors.ErrInvalidReviewInput)
	}

	cleanedWords, err := normalizeAndDedupeWords(req.Words)
	if err != nil {
		return nil, err
	}

	// Fetch existing lists to prevent the same word from living in both lists
	existingBlocked, existingAllowed, err := s.repo.GetAllGrouped(ctx)
	if err != nil {
		return nil, err
	}

	oppositeList := existingAllowed
	oppositeLabel := "allowed"
	if req.Type == models.WordTypeAllowed {
		oppositeList = existingBlocked
		oppositeLabel = "blocked"
	}

	var conflicts []string
	for _, w := range cleanedWords {
		if slices.Contains(oppositeList, w) {
			conflicts = append(conflicts, w)
		}
	}
	if len(conflicts) > 0 {
		return nil, fmt.Errorf(
			"%w: cannot add words that already exist in %s list: %s",
			apperrors.ErrInvalidReviewInput,
			oppositeLabel,
			strings.Join(conflicts, ", "),
		)
	}

	// Idempotent bulk upsert (already-existing words in the same list are ignored)
	if err := s.repo.UpsertWords(ctx, cleanedWords, req.Type, adminUserID); err != nil {
		return nil, err
	}

	return s.reloadAndList(ctx)
}

func (s *ModerationWordService) RemoveWord(
	ctx context.Context,
	req dto.DeleteModerationWordRequest,
) (*dto.ModerationWordsResponse, error) {
	word := strings.ToLower(strings.TrimSpace(req.Word))
	if word == "" {
		return nil, fmt.Errorf("%w: word cannot be empty", apperrors.ErrInvalidReviewInput)
	}
	if req.Type != models.WordTypeBlocked && req.Type != models.WordTypeAllowed {
		return nil, fmt.Errorf("%w: type must be 'blocked' or 'allowed'", apperrors.ErrInvalidReviewInput)
	}

	if err := s.repo.DeleteWord(ctx, word, req.Type); err != nil {
		return nil, err
	}

	return s.reloadAndList(ctx)
}

func (s *ModerationWordService) reloadAndList(ctx context.Context) (*dto.ModerationWordsResponse, error) {
	blocked, allowed, err := s.repo.GetAllGrouped(ctx)
	if err != nil {
		return nil, err
	}

	sanitizer.ConfigureProfanityFilter(blocked, allowed)

	return buildModerationWordsResponse(blocked, allowed), nil
}

func normalizeAndDedupeWords(raw []string) ([]string, error) {
	seen := make(map[string]struct{}, len(raw))
	out := make([]string, 0, len(raw))

	for _, item := range raw {
		cleaned := strings.ToLower(strings.TrimSpace(item))
		if cleaned == "" {
			continue
		}
		if utf8.RuneCountInString(cleaned) > 64 {
			return nil, fmt.Errorf("%w: word '%s' cannot exceed 64 characters", apperrors.ErrInvalidReviewInput, cleaned)
		}
		if _, exists := seen[cleaned]; !exists {
			seen[cleaned] = struct{}{}
			out = append(out, cleaned)
		}
	}

	if len(out) == 0 {
		return nil, fmt.Errorf("%w: at least one non-empty word is required", apperrors.ErrInvalidReviewInput)
	}
	return out, nil
}

func buildModerationWordsResponse(blocked, allowed []string) *dto.ModerationWordsResponse {
	if blocked == nil {
		blocked = make([]string, 0)
	}
	if allowed == nil {
		allowed = make([]string, 0)
	}
	return &dto.ModerationWordsResponse{
		Blocked: blocked,
		Allowed: allowed,
	}
}
