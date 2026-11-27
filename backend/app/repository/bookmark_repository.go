package repository

import (
	"context"

	"movie-app/models"
)

type BookmarkListFilter struct {
	UserID    string
	MediaType *models.BookmarkMediaType
	Skip      int64
	Limit     int64
}

type BookmarkRepository interface {
	Upsert(ctx context.Context, bookmark *models.Bookmark) (*models.Bookmark, error)
	Delete(ctx context.Context, userID string, mediaType models.BookmarkMediaType, mediaID string) (bool, error)
	IsBookmarked(ctx context.Context, userID string, mediaType models.BookmarkMediaType, mediaID string) (bool, error)
	List(ctx context.Context, filter BookmarkListFilter) ([]*models.Bookmark, int64, error)
}
