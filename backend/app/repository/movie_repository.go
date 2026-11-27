package repository

import (
	"context"
	"movie-app/models"
)

type MovieRepository interface {
	UpsertByTraktID(ctx context.Context, movie *models.Movie) (*models.Movie, error)
	FindByTraktID(ctx context.Context, traktID int) (*models.Movie, error)
	FindBySlug(ctx context.Context, slug string) (*models.Movie, error)
	FindByIDOrSlug(ctx context.Context, idOrSlug string) (*models.Movie, error)
	SearchLocal(ctx context.Context, query string, page, limit int, filters MediaSearchFilters) ([]models.Movie, int64, error)
	FindByIDsOrSlugs(ctx context.Context, idsOrSlugs []string) ([]models.Movie, error)
}
