package services

import (
	"context"
	"errors"
	"fmt"
	"movie-app/apperrors"
	"movie-app/dto"
	"movie-app/models"
	"movie-app/repository"
	"movie-app/sanitizer"
	"strings"
	"unicode"
	"unicode/utf8"

	"go.mongodb.org/mongo-driver/v2/mongo"
)

type ReviewService struct {
	reviewRepo   repository.ReviewRepository
	userRepo     repository.UserRepository
	movieRepo    repository.MovieRepository
	showRepo     repository.ShowRepository
	movieService *MovieService
	showService  *ShowService
}

func NewReviewService(
	reviewRepo repository.ReviewRepository,
	userRepo repository.UserRepository,
	movieRepo repository.MovieRepository,
	showRepo repository.ShowRepository,
	movieService *MovieService,
	showService *ShowService,
) *ReviewService {
	return &ReviewService{
		reviewRepo:   reviewRepo,
		userRepo:     userRepo,
		movieRepo:    movieRepo,
		showRepo:     showRepo,
		movieService: movieService,
		showService:  showService,
	}
}

func (s *ReviewService) resolveMediaID(
	ctx context.Context,
	mediaType models.MediaType,
	idOrSlug string,
) (string, error) {
	switch mediaType {
	case models.MediaTypeMovie:
		m, err := s.movieService.GetMovieDetails(ctx, idOrSlug)
		if err != nil {
			if isMediaNotFoundErr(err) {
				return "", apperrors.ErrMediaNotFound
			}
			return "", err
		}
		return m.ID.Hex(), nil

	case models.MediaTypeShow:
		sh, err := s.showService.GetShowDetails(ctx, idOrSlug)
		if err != nil {
			if isMediaNotFoundErr(err) {
				return "", apperrors.ErrMediaNotFound
			}
			return "", err
		}
		return sh.ID.Hex(), nil

	default:
		return "", fmt.Errorf("%w: unsupported media type", apperrors.ErrInvalidReviewInput)
	}
}

func isMediaNotFoundErr(err error) bool {
	if errors.Is(err, mongo.ErrNoDocuments) || errors.Is(err, apperrors.ErrMediaNotFound) {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "not found") || strings.Contains(msg, "404")
}

func (s *ReviewService) UpsertReview(
	ctx context.Context,
	userID string,
	mediaType models.MediaType,
	mediaIDOrSlug string,
	req dto.UpsertReviewRequest,
) (*dto.ReviewResponse, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("%w: invalid user id", apperrors.ErrInvalidReviewInput)
	}

	if req.Rating < 1 || req.Rating > 10 {
		return nil, fmt.Errorf("%w: rating must be between 1 and 10", apperrors.ErrInvalidReviewInput)
	}

	// 1. Strip HTML tags and normalize whitespace via bluemonday StrictPolicy
	title := sanitizer.SanitizeStrict(req.Title)
	body := sanitizer.SanitizeStrict(req.Body)

	// 2. Enforce character length caps on the sanitized plain text
	if utf8.RuneCountInString(title) > 150 {
		return nil, fmt.Errorf("%w: review title cannot exceed 150 characters", apperrors.ErrInvalidReviewInput)
	}
	if utf8.RuneCountInString(body) > 5000 {
		return nil, fmt.Errorf("%w: review body cannot exceed 5000 characters", apperrors.ErrInvalidReviewInput)
	}

	mediaID, err := s.resolveMediaID(ctx, mediaType, mediaIDOrSlug)
	if err != nil {
		return nil, err
	}

	saved, err := s.reviewRepo.Upsert(ctx, userID, mediaType, mediaID, &models.Review{
		Rating:    req.Rating,
		Title:     title,
		Body:      body,
		IsSpoiler: req.IsSpoiler,
	})
	if err != nil {
		return nil, err
	}

	return s.hydrateSingleReview(ctx, saved, userID, false), nil
}

func (s *ReviewService) GetMediaReviews(
	ctx context.Context,
	mediaType models.MediaType,
	mediaIDOrSlug string,
	viewerID string,
	sort repository.ReviewSort,
	onlyWritten bool,
	page, limit int,
) (dto.MediaReviewsListResponse, error) {
	page, limit = normalizePagination(page, limit)

	mediaID, err := s.resolveMediaID(ctx, mediaType, mediaIDOrSlug)
	if err != nil {
		return dto.MediaReviewsListResponse{}, err
	}

	stats, err := s.reviewRepo.GetMediaStats(ctx, mediaType, mediaID)
	if err != nil {
		return dto.MediaReviewsListResponse{}, err
	}

	reviews, total, err := s.reviewRepo.ListByMedia(ctx, mediaType, mediaID, sort, onlyWritten, page, limit)
	if err != nil {
		return dto.MediaReviewsListResponse{}, err
	}

	var myReview *dto.ReviewResponse
	if viewerID != "" {
		if mine, mineErr := s.reviewRepo.FindByUserAndMedia(ctx, viewerID, mediaType, mediaID); mineErr == nil && mine != nil {
			myReview = s.hydrateSingleReview(ctx, mine, viewerID, false)
		}
	}

	hydrated := s.hydrateReviews(ctx, reviews, viewerID, false)
	totalPages := int((total + int64(limit) - 1) / int64(limit))

	return dto.MediaReviewsListResponse{
		Stats:    stats,
		MyReview: myReview,
		Results:  hydrated,
		Pagination: dto.PaginationResponse{
			Page:       page,
			Limit:      limit,
			TotalPages: totalPages,
			TotalItems: int(total),
		},
	}, nil
}

func (s *ReviewService) GetUserReviews(
	ctx context.Context,
	targetUserID string,
	viewerID string,
	mediaType models.MediaType,
	page, limit int,
) ([]dto.ReviewResponse, dto.PaginationResponse, error) {
	page, limit = normalizePagination(page, limit)

	if strings.TrimSpace(targetUserID) == "" {
		return nil, dto.PaginationResponse{}, fmt.Errorf("%w: invalid user id", apperrors.ErrInvalidReviewInput)
	}

	reviews, total, err := s.reviewRepo.ListByUser(ctx, targetUserID, mediaType, page, limit)
	if err != nil {
		return nil, dto.PaginationResponse{}, err
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	return s.hydrateReviews(ctx, reviews, viewerID, true), dto.PaginationResponse{
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
		TotalItems: int(total),
	}, nil
}

func (s *ReviewService) ToggleHelpful(
	ctx context.Context,
	reviewID string,
	userID string,
) (*dto.ReviewResponse, bool, error) {
	existing, err := s.reviewRepo.FindByID(ctx, reviewID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, false, apperrors.ErrReviewNotFound
		}
		return nil, false, err
	}

	if existing.UserID.Hex() == userID {
		return nil, false, apperrors.ErrSelfHelpfulVote
	}

	updated, added, err := s.reviewRepo.ToggleHelpful(ctx, reviewID, userID)
	if err != nil {
		return nil, false, err
	}

	return s.hydrateSingleReview(ctx, updated, userID, false), added, nil
}

func (s *ReviewService) DeleteReview(
	ctx context.Context,
	reviewID string,
	requesterID string,
	isAdmin bool,
) error {
	existing, err := s.reviewRepo.FindByID(ctx, reviewID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return apperrors.ErrReviewNotFound
		}
		return err
	}

	if !isAdmin && existing.UserID.Hex() != requesterID {
		return apperrors.ErrReviewForbidden
	}

	return s.reviewRepo.DeleteByID(ctx, reviewID)
}

func (s *ReviewService) hydrateSingleReview(
	ctx context.Context,
	r *models.Review,
	viewerID string,
	includeMedia bool,
) *dto.ReviewResponse {
	list := s.hydrateReviews(ctx, []models.Review{*r}, viewerID, includeMedia)
	if len(list) == 0 {
		return nil
	}
	return &list[0]
}

func (s *ReviewService) hydrateReviews(
	ctx context.Context,
	reviews []models.Review,
	viewerID string,
	includeMedia bool,
) []dto.ReviewResponse {
	authorCache := make(map[string]dto.ReviewAuthorResponse)
	mediaCache := make(map[string]*dto.ReviewMediaSummary)
	out := make([]dto.ReviewResponse, 0, len(reviews))

	for _, r := range reviews {
		authorID := r.UserID.Hex()
		author, ok := authorCache[authorID]
		if !ok {
			author = dto.ReviewAuthorResponse{
				ID:   authorID,
				Name: "Member",
			}
			if s.userRepo != nil {
				if u, err := s.userRepo.FindByID(ctx, authorID); err == nil && u != nil {
					if displayName := formatAuthorDisplayName(u.FirstName, u.LastName); displayName != "" {
						author.Name = displayName
					} else if u.Username != "" {
						author.Name = u.Username
					}
					author.Username = u.Username
					// author.Avatar = u.ProfilePic
				}
			}
			authorCache[authorID] = author
		}

		var mediaSummary *dto.ReviewMediaSummary
		mediaIDHex := r.MediaID.Hex()
		if includeMedia {
			cacheKey := string(r.MediaType) + ":" + mediaIDHex
			cachedMedia, found := mediaCache[cacheKey]
			if !found {
				cachedMedia = s.lookupMediaSummary(ctx, r.MediaType, mediaIDHex)
				mediaCache[cacheKey] = cachedMedia
			}
			mediaSummary = cachedMedia
		}

		isHelpful := false
		if viewerID != "" {
			for _, uid := range r.HelpfulUserIDs {
				if uid.Hex() == viewerID {
					isHelpful = true
					break
				}
			}
		}

		out = append(out, dto.ReviewResponse{
			ID:           r.ID.Hex(),
			User:         author,
			MediaType:    r.MediaType,
			MediaID:      mediaIDHex,
			Media:        mediaSummary,
			Rating:       r.Rating,
			Title:        r.Title,
			Body:         r.Body,
			IsSpoiler:    r.IsSpoiler,
			HelpfulCount: r.HelpfulCount,
			IsHelpful:    isHelpful,
			IsOwner:      viewerID != "" && authorID == viewerID,
			CreatedAt:    r.CreatedAt,
			UpdatedAt:    r.UpdatedAt,
		})
	}

	return out
}

func (s *ReviewService) lookupMediaSummary(
	ctx context.Context,
	mediaType models.MediaType,
	mediaID string,
) *dto.ReviewMediaSummary {
	switch mediaType {
	case models.MediaTypeMovie:
		if s.movieRepo != nil {
			if m, err := s.movieRepo.FindByIDOrSlug(ctx, mediaID); err == nil && m != nil {
				return &dto.ReviewMediaSummary{
					ID:     m.ID.Hex(),
					Type:   models.MediaTypeMovie,
					Slug:   m.IDs.Slug,
					Title:  m.Title,
					Year:   m.Year,
					Poster: m.Artwork.Poster,
				}
			}
		}
	case models.MediaTypeShow:
		if s.showRepo != nil {
			if sh, err := s.showRepo.FindByIDOrSlug(ctx, mediaID); err == nil && sh != nil {
				return &dto.ReviewMediaSummary{
					ID:     sh.ID.Hex(),
					Type:   models.MediaTypeShow,
					Slug:   sh.IDs.Slug,
					Title:  sh.Title,
					Year:   sh.Year,
					Poster: sh.Artwork.Poster,
				}
			}
		}
	}
	return nil
}

func formatAuthorDisplayName(firstName, lastName string) string {
	first := strings.TrimSpace(firstName)
	last := strings.TrimSpace(lastName)

	if first == "" && last == "" {
		return ""
	}

	var parts []string
	if first != "" {
		r, size := utf8.DecodeRuneInString(first)
		parts = append(parts, string(unicode.ToUpper(r))+first[size:])
	}
	if last != "" {
		r, _ := utf8.DecodeRuneInString(last)
		parts = append(parts, string(unicode.ToUpper(r))+".")
	}

	return strings.Join(parts, " ")
}
