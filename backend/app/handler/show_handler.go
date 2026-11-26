package handler

import (
	"errors"
	"movie-app/apperrors"
	"movie-app/dto"
	"movie-app/services"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type ShowHandler struct {
	showService *services.ShowService
}

func NewShowHandler(showService *services.ShowService) *ShowHandler {
	return &ShowHandler{
		showService: showService,
	}
}

func (h *ShowHandler) GetTrending(c *gin.Context) {
	page, limit := parsePageLimit(c)
	country, genre, err := parseFeedFilters(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	shows, pagination, err := h.showService.GetTrendingShows(c.Request.Context(), page, limit, country, genre)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"results":    shows,
		"pagination": pagination,
	})
}

func (h *ShowHandler) GetPopular(c *gin.Context) {
	page, limit := parsePageLimit(c)
	country, genre, err := parseFeedFilters(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	shows, pagination, err := h.showService.GetPopularShows(c.Request.Context(), page, limit, country, genre)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"results":    shows,
		"pagination": pagination,
	})
}

func (h *ShowHandler) Search(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	filters := parseMediaSearchFilters(c)
	if q == "" && !filters.IsActive() {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "search query 'q' or at least one filter is required",
		})
		return
	}

	page, limit := parsePageLimit(c)

	res, err := h.showService.SearchShows(c.Request.Context(), q, page, limit, filters)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *ShowHandler) GetDetails(c *gin.Context) {
	idOrSlug := strings.TrimSpace(c.Param("id"))
	if idOrSlug == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "show id or slug is required",
		})
		return
	}

	show, err := h.showService.GetShowDetails(c.Request.Context(), idOrSlug)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"show": show,
	})
}

// In handler/show_handler.go
func (h *ShowHandler) ForceSync(c *gin.Context) {
	idOrSlug := strings.TrimSpace(c.Param("id"))
	if idOrSlug == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "show id or slug is required",
		})
		return
	}

	show, err := h.showService.ForceSyncShow(c.Request.Context(), idOrSlug)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Show synced successfully.",
		"show":    show,
	})
}

func (h *ShowHandler) BatchForceSync(c *gin.Context) {
	var req dto.BatchSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	res, err := h.showService.BatchForceSyncShows(c.Request.Context(), req.IDs)
	if err != nil {
		if errors.Is(err, apperrors.ErrInvalidBatchSync) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})
			return
		}
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *ShowHandler) AdminSearch(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	source := strings.TrimSpace(c.DefaultQuery("source", "trakt"))

	if q == "" && !strings.EqualFold(source, "local") {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "search query 'q' is required when searching Trakt",
		})
		return
	}

	page, limit := parsePageLimit(c)
	items, pagination, err := h.showService.AdminSearchShows(
		c.Request.Context(),
		q,
		source,
		page,
		limit,
	)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"results":    items,
		"pagination": pagination,
	})
}
