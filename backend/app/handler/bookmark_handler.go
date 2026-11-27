package handler

import (
	"errors"
	"net/http"
	"strings"

	"movie-app/apperrors"
	"movie-app/dto"
	"movie-app/models"
	"movie-app/services"

	"github.com/gin-gonic/gin"
)

type BookmarkHandler struct {
	bookmarkService *services.BookmarkService
}

func NewBookmarkHandler(
	bookmarkService *services.BookmarkService,
) *BookmarkHandler {
	return &BookmarkHandler{
		bookmarkService: bookmarkService,
	}
}

func (h *BookmarkHandler) Add(c *gin.Context) {
	userID := strings.TrimSpace(c.GetString("userID"))
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "unauthorized",
		})
		return
	}

	var req dto.AddBookmarkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	bookmark, err := h.bookmarkService.Add(
		c.Request.Context(),
		userID,
		&req,
	)
	if err != nil {
		switch {
		case errors.Is(err, apperrors.ErrInvalidUserID):
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "unauthorized",
			})

		case errors.Is(err, apperrors.ErrInvalidMediaType),
			errors.Is(err, apperrors.ErrInvalidBookmarkPayload):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})

		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "unable to add bookmark",
			})
		}

		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "bookmark added successfully",
		"bookmark": bookmark,
	})
}

func (h *BookmarkHandler) Remove(c *gin.Context) {
	userID := strings.TrimSpace(c.GetString("userID"))
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "unauthorized",
		})
		return
	}

	mediaType := models.BookmarkMediaType(strings.TrimSpace(c.Param("mediaType")))
	mediaID := strings.TrimSpace(c.Param("mediaId"))

	if mediaType == "" || mediaID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "media type and media id are required",
		})
		return
	}

	if err := h.bookmarkService.Remove(
		c.Request.Context(),
		userID,
		mediaType,
		mediaID,
	); err != nil {
		switch {
		case errors.Is(err, apperrors.ErrInvalidMediaType):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})

		case errors.Is(err, apperrors.ErrBookmarkNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": "bookmark not found",
			})

		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "unable to remove bookmark",
			})
		}

		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "bookmark removed successfully",
	})
}

func (h *BookmarkHandler) CheckStatus(c *gin.Context) {
	userID := strings.TrimSpace(c.GetString("userID"))
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "unauthorized",
		})
		return
	}

	mediaType := models.BookmarkMediaType(strings.TrimSpace(c.Param("mediaType")))
	mediaID := strings.TrimSpace(c.Param("mediaId"))

	if mediaType == "" || mediaID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "media type and media id are required",
		})
		return
	}

	bookmarked, err := h.bookmarkService.IsBookmarked(
		c.Request.Context(),
		userID,
		mediaType,
		mediaID,
	)
	if err != nil {
		if errors.Is(err, apperrors.ErrInvalidMediaType) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "unable to check bookmark status",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"bookmarked": bookmarked,
	})
}

func (h *BookmarkHandler) List(c *gin.Context) {
	userID := strings.TrimSpace(c.GetString("userID"))
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "unauthorized",
		})
		return
	}

	var query dto.ListBookmarksQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid query parameters",
		})
		return
	}

	var mediaType *models.BookmarkMediaType
	if trimmedType := strings.TrimSpace(query.MediaType); trimmedType != "" {
		mt := models.BookmarkMediaType(trimmedType)
		mediaType = &mt
	}

	limit := query.Limit
	if limit == 0 {
		limit = 20
	}

	bookmarks, total, page, totalPages, err := h.bookmarkService.List(
		c.Request.Context(),
		services.BookmarkListOptions{
			UserID:    userID,
			MediaType: mediaType,
			Page:      query.Page,
			Limit:     query.Limit,
		},
	)
	if err != nil {
		switch {
		case errors.Is(err, apperrors.ErrInvalidPage),
			errors.Is(err, apperrors.ErrInvalidLimit),
			errors.Is(err, apperrors.ErrInvalidMediaType):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})

		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "failed to list bookmarks",
			})
		}

		return
	}

	c.JSON(http.StatusOK, dto.BookmarkListResponse{
		Bookmarks: bookmarks,
		Pagination: dto.BookmarkPagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}
