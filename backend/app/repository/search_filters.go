package repository

import (
	"strconv"
	"strings"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type MediaSearchFilters struct {
	Genre     string   // Kept for single-genre backward compatibility
	Genres    []string // Multi-genre AND matching (e.g., ["horror", "comedy"])
	Year      string
	MinRating float64
	Language  string
	Country   string
	Status    string
}

func (f MediaSearchFilters) NormalizedGenres() []string {
	seen := make(map[string]struct{}, len(f.Genres)+1)
	out := make([]string, 0, len(f.Genres)+1)

	add := func(raw string) {
		for _, part := range strings.Split(raw, ",") {
			g := strings.ToLower(strings.TrimSpace(part))
			if g == "" {
				continue
			}
			if _, exists := seen[g]; exists {
				continue
			}
			seen[g] = struct{}{}
			out = append(out, g)
		}
	}

	for _, g := range f.Genres {
		add(g)
	}
	if strings.TrimSpace(f.Genre) != "" {
		add(f.Genre)
	}

	return out
}

func (f MediaSearchFilters) IsActive() bool {
	return len(f.NormalizedGenres()) > 0 ||
		strings.TrimSpace(f.Year) != "" ||
		f.MinRating > 0 ||
		strings.TrimSpace(f.Language) != "" ||
		strings.TrimSpace(f.Country) != "" ||
		strings.TrimSpace(f.Status) != ""
}

// ParseYearRange handles individual years (e.g., 2026, 2025, 2024, 2023, 2022, 2021, 2020),
// explicit YYYY-YYYY ranges, and pre-2020 decade buckets ("2010s", "2000s", "1990s", "classic").
func ParseYearRange(raw string) (int, int, bool) {
	s := strings.ToLower(strings.TrimSpace(raw))
	if s == "" {
		return 0, 0, false
	}

	switch s {
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
	if genres := f.NormalizedGenres(); len(genres) > 0 {
		if len(genres) == 1 {
			filter["genres"] = genres[0]
		} else {
			filter["genres"] = bson.M{"$all": genres}
		}
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

	if lang := strings.ToLower(strings.TrimSpace(f.Language)); lang != "" {
		filter["language"] = lang
	}

	if c := strings.ToLower(strings.TrimSpace(f.Country)); c != "" {
		filter["country"] = c
	}

	if st := strings.ToLower(strings.TrimSpace(f.Status)); st != "" {
		filter["status"] = st
	}
}
