package repository

import (
	"context"
	"movie-app/models"
)

type ShowRepository interface {
	UpsertByTraktID(ctx context.Context, show *models.Show) (*models.Show, error)
	FindByTraktID(ctx context.Context, traktID int) (*models.Show, error)
	FindBySlug(ctx context.Context, slug string) (*models.Show, error)
	FindByIDOrSlug(ctx context.Context, idOrSlug string) (*models.Show, error)
	SearchLocal(ctx context.Context, query string, page, limit int, filters MediaSearchFilters) ([]models.Show, int64, error)
	FindByIDsOrSlugs(ctx context.Context, idsOrSlugs []string) ([]models.Show, error)
}
