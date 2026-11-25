package handler

import (
	"errors"
	"movie-app/repository"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func parseFeedFilters(c *gin.Context) (string, string, error) {
	country := strings.ToLower(strings.TrimSpace(c.Query("country")))
	if country != "" {
		if len(country) != 2 || country[0] < 'a' || country[0] > 'z' || country[1] < 'a' || country[1] > 'z' {
			return "", "", errors.New("country must be a 2-letter ISO code (e.g., us, in, gb)")
		}
	}

	genre := strings.ToLower(strings.TrimSpace(c.Query("genre")))
	if genre != "" {
		if len(genre) > 32 {
			return "", "", errors.New("invalid genre filter")
		}
		for i := 0; i < len(genre); i++ {
			ch := genre[i]
			if !((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '-') {
				return "", "", errors.New("genre must contain only lowercase letters, numbers, or hyphens")
			}
		}
	}

	return country, genre, nil
}

func parseMediaSearchFilters(c *gin.Context) repository.MediaSearchFilters {
	var minRating float64
	if raw := strings.TrimSpace(c.Query("min_rating")); raw != "" {
		if val, err := strconv.ParseFloat(raw, 64); err == nil && val > 0 {
			minRating = val
		}
	}

	return repository.MediaSearchFilters{
		Genre:     strings.TrimSpace(c.Query("genre")),
		Year:      strings.TrimSpace(c.Query("year")),
		MinRating: minRating,
		Country:   strings.TrimSpace(c.Query("country")),
		Status:    strings.TrimSpace(c.Query("status")),
	}
}
