package sanitizer

import (
	"slices"
	"strings"
	"sync/atomic"

	goaway "github.com/TwiN/go-away"
)

var activeDetector atomic.Pointer[goaway.ProfanityDetector]

func init() {
	ConfigureProfanityFilter(nil, nil)
}

// ConfigureProfanityFilter merges built-in defaults with custom blocked and allowed
// words from MongoDB and atomically swaps the active detector.
func ConfigureProfanityFilter(extraBlocked, extraAllowed []string) {
	profanities := slices.Concat(
		goaway.DefaultProfanities,
		normalizeWords(extraBlocked),
	)

	falsePositives := slices.Concat(
		goaway.DefaultFalsePositives,
		normalizeWords(extraAllowed),
	)

	detector := goaway.NewProfanityDetector().
		WithCustomDictionary(profanities, falsePositives, goaway.DefaultFalseNegatives)

	activeDetector.Store(detector)
}

func normalizeWords(words []string) []string {
	out := make([]string, 0, len(words))
	for _, w := range words {
		if cleaned := strings.ToLower(strings.TrimSpace(w)); cleaned != "" {
			out = append(out, cleaned)
		}
	}
	return out
}

func ContainsProfanity(input string) bool {
	if input == "" {
		return false
	}
	return activeDetector.Load().IsProfane(input)
}

func ExtractProfanity(input string) string {
	if input == "" {
		return ""
	}
	return activeDetector.Load().ExtractProfanity(input)
}
