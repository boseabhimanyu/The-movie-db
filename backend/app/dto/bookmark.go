package dto

import (
	"time"

	"movie-app/models"
)

func ToBookmarkItem(b *models.Bookmark) BookmarkItem {
	return BookmarkItem{
		ID:        b.ID.Hex(),
		MediaType: b.MediaType,
		MediaID:   b.MediaID,
		CreatedAt: b.CreatedAt,
	}
}

type ListBookmarksQuery struct {
	Page      int    `form:"page"`
	Limit     int    `form:"limit"`
	MediaType string `form:"mediaType"`
}

type BookmarkPagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"totalPages"`
}

type BookmarkListResponse struct {
	Bookmarks  []BookmarkItem     `json:"bookmarks"`
	Pagination BookmarkPagination `json:"pagination"`
}

type AddBookmarkRequest struct {
	MediaType models.BookmarkMediaType `json:"mediaType" binding:"required"`
	MediaID   string                   `json:"mediaId" binding:"required"`
}

type BookmarkItem struct {
	ID        string                   `json:"id"`
	MediaType models.BookmarkMediaType `json:"mediaType"`
	MediaID   string                   `json:"mediaId"`
	Slug      string                   `json:"slug,omitempty"`
	Title     string                   `json:"title,omitempty"`
	Year      int                      `json:"year,omitempty"`
	Poster    string                   `json:"poster,omitempty"`
	Rating    float64                  `json:"rating,omitempty"`
	CreatedAt time.Time                `json:"createdAt"`
}
