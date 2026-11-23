package repository

import (
	"context"
	"movie-app/models"
)

type PersonRepository interface {
	UpsertByTraktID(ctx context.Context, person *models.Person) (*models.Person, error)
	FindByTraktID(ctx context.Context, traktID int) (*models.Person, error)
	FindBySlug(ctx context.Context, slug string) (*models.Person, error)
	FindByIDOrSlug(ctx context.Context, idOrSlug string) (*models.Person, error)
	FindLocalMoviePostersByTraktIDs(ctx context.Context, traktIDs []int) (map[int]string, error)
	FindLocalShowPostersByTraktIDs(ctx context.Context, traktIDs []int) (map[int]string, error)
}
