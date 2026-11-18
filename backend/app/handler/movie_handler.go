package handler

import (
	"errors"
	"movie-app/apperrors"
	"movie-app/dto"
	"movie-app/integrations/trakt"
	"movie-app/services"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type MovieHandler struct {
	movieService *services.MovieService
}

func NewMovieHandler(movieService *services.MovieService) *MovieHandler {
	return &MovieHandler{
		movieService: movieService,
	}
}

func (h *MovieHandler) GetTrending(c *gin.Context) {
	page, limit := parsePageLimit(c)

	res, err := h.movieService.GetTrendingMovies(c.Request.Context(), page, limit)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *MovieHandler) GetPopular(c *gin.Context) {
	page, limit := parsePageLimit(c)

	res, err := h.movieService.GetPopularMovies(c.Request.Context(), page, limit)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *MovieHandler) Search(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "search query 'q' is required",
		})
		return
	}

	page, limit := parsePageLimit(c)

	res, err := h.movieService.SearchMovies(c.Request.Context(), q, page, limit)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *MovieHandler) GetDetails(c *gin.Context) {
	idOrSlug := strings.TrimSpace(c.Param("id"))
	if idOrSlug == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "movie id or slug is required",
		})
		return
	}

	movie, err := h.movieService.GetMovieDetails(c.Request.Context(), idOrSlug)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"movie": movie,
	})
}

func parsePageLimit(c *gin.Context) (int, int) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit < 1 {
		limit = 20
	}

	return page, limit
}

func handleMediaError(c *gin.Context, err error) {
	if services.IsMediaNotFound(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "media not found",
		})
		return
	}

	if errors.Is(err, trakt.ErrRateLimited) {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": "external media provider rate limit exceeded, please try again shortly",
		})
		return
	}

	c.JSON(http.StatusBadGateway, gin.H{
		"error": "failed to fetch media data",
	})
}

// In handler/movie_handler.go
func (h *MovieHandler) ForceSync(c *gin.Context) {
	idOrSlug := strings.TrimSpace(c.Param("id"))
	if idOrSlug == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "movie id or slug is required",
		})
		return
	}

	movie, err := h.movieService.ForceSyncMovie(c.Request.Context(), idOrSlug)
	if err != nil {
		handleMediaError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Movie synced successfully.",
		"movie":   movie,
	})
}

func (h *MovieHandler) BatchForceSync(c *gin.Context) {
	var req dto.BatchSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	res, err := h.movieService.BatchForceSyncMovies(c.Request.Context(), req.IDs)
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

func (h *MovieHandler) AdminSearch(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	source := strings.TrimSpace(c.DefaultQuery("source", "trakt"))

	if q == "" && !strings.EqualFold(source, "local") {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "search query 'q' is required when searching Trakt",
		})
		return
	}

	page, limit := parsePageLimit(c)
	items, pagination, err := h.movieService.AdminSearchMovies(
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
