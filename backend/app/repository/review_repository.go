package repository

import (
	"context"
	"movie-app/models"
)

type ReviewSort string

const (
	ReviewSortRecent  ReviewSort = "recent"
	ReviewSortHelpful ReviewSort = "helpful"
	ReviewSortHighest ReviewSort = "highest"
	ReviewSortLowest  ReviewSort = "lowest"
)

type ReviewRepository interface {
	Create(ctx context.Context, userID string, mediaType models.MediaType, mediaID string, review *models.Review) (*models.Review, error)
	Update(ctx context.Context, review *models.Review) (*models.Review, error)
	FindByID(ctx context.Context, id string) (*models.Review, error)
	FindByUserAndMedia(ctx context.Context, userID string, mediaType models.MediaType, mediaID string) (*models.Review, error)
	ListByMedia(ctx context.Context, mediaType models.MediaType, mediaID string, sort ReviewSort, onlyWritten bool, page, limit int) ([]models.Review, int64, error)
	ListByUser(ctx context.Context, userID string, mediaType models.MediaType, page, limit int) ([]models.Review, int64, error)
	GetMediaStats(ctx context.Context, mediaType models.MediaType, mediaID string) (models.MediaRatingStats, error)
	ToggleHelpful(ctx context.Context, reviewID, userID string) (*models.Review, bool, error)
	DeleteByID(ctx context.Context, reviewID string) error
}
