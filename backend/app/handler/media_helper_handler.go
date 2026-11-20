package handler

import (
	"errors"
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
