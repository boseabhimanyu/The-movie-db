package repository

import (
	"strconv"
	"strings"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type MediaSearchFilters struct {
	Genre     string
	Year      string
	MinRating float64
	Country   string
	Status    string
}

func (f MediaSearchFilters) IsActive() bool {
	return strings.TrimSpace(f.Genre) != "" ||
		strings.TrimSpace(f.Year) != "" ||
		f.MinRating > 0 ||
		strings.TrimSpace(f.Country) != "" ||
		strings.TrimSpace(f.Status) != ""
}

func ParseYearRange(raw string) (int, int, bool) {
	s := strings.ToLower(strings.TrimSpace(raw))
	if s == "" {
		return 0, 0, false
	}

	switch s {
	case "2020s":
		return 2020, 2029, true
	case "2010s":
		return 2010, 2019, true
	case "2000s":
		return 2000, 2009, true
	case "1990s":
		return 1990, 1999, true
	case "classic":
		return 1880, 1989, true
	}

	if strings.Contains(s, "-") {
		parts := strings.SplitN(s, "-", 2)
		start, err1 := strconv.Atoi(strings.TrimSpace(parts[0]))
		end, err2 := strconv.Atoi(strings.TrimSpace(parts[1]))
		if err1 == nil && err2 == nil && start > 0 && end >= start {
			return start, end, true
		}
		return 0, 0, false
	}

	y, err := strconv.Atoi(s)
	if err == nil && y > 0 {
		return y, y, true
	}
	return 0, 0, false
}

func ApplyMongoMediaFilters(filter bson.M, f MediaSearchFilters) {
	if g := strings.ToLower(strings.TrimSpace(f.Genre)); g != "" {
		filter["genres"] = g
	}

	if minY, maxY, ok := ParseYearRange(f.Year); ok {
		if minY == maxY {
			filter["year"] = minY
		} else {
			filter["year"] = bson.M{"$gte": minY, "$lte": maxY}
		}
	}

	if f.MinRating > 0 {
		filter["rating"] = bson.M{"$gte": f.MinRating}
	}

	if c := strings.ToLower(strings.TrimSpace(f.Country)); c != "" {
		filter["country"] = c
	}

	if st := strings.ToLower(strings.TrimSpace(f.Status)); st != "" {
		filter["status"] = st
	}
}
