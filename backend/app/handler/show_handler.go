package handler

import (
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

	res, err := h.showService.GetTrendingShows(c.Request.Context(), page, limit)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *ShowHandler) GetPopular(c *gin.Context) {
	page, limit := parsePageLimit(c)

	res, err := h.showService.GetPopularShows(c.Request.Context(), page, limit)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *ShowHandler) Search(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "search query 'q' is required",
		})
		return
	}

	page, limit := parsePageLimit(c)

	res, err := h.showService.SearchShows(c.Request.Context(), q, page, limit)
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
