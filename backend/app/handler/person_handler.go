package handler

import (
	"errors"
	"movie-app/integrations/trakt"
	"movie-app/services"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type PersonHandler struct {
	personService *services.PersonService
}

func NewPersonHandler(personService *services.PersonService) *PersonHandler {
	return &PersonHandler{
		personService: personService,
	}
}

func (h *PersonHandler) GetDetails(c *gin.Context) {
	idOrSlug := strings.TrimSpace(c.Param("id"))
	if idOrSlug == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "person id or slug is required",
		})
		return
	}

	details, err := h.personService.GetPersonDetails(c.Request.Context(), idOrSlug)
	if err != nil {
		if errors.Is(err, trakt.ErrNotFound) || services.IsMediaNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "person not found",
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
			"error": "failed to fetch person details",
		})
		return
	}

	c.Header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")
	c.JSON(http.StatusOK, details)
}
