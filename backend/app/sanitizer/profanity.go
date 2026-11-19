package sanitizer

import (
	"slices"
	"strings"
	"sync/atomic"

	goaway "github.com/TwiN/go-away"
)

type filterState struct {
	detector     *goaway.ProfanityDetector
	blockedWords []string
	allowedWords []string
}

var activeFilter atomic.Pointer[filterState]

func init() {
	ConfigureProfanityFilter(nil, nil)
}

// ConfigureProfanityFilter merges built-in defaults with custom blocked and allowed
// words from MongoDB and atomically swaps the active filter.
func ConfigureProfanityFilter(extraBlocked, extraAllowed []string) {
	cleanedBlocked := normalizeWords(extraBlocked)
	cleanedAllowed := normalizeWords(extraAllowed)

	falsePositives := slices.Concat(
		goaway.DefaultFalsePositives,
		cleanedAllowed,
	)

	detector := goaway.NewProfanityDetector().
		WithCustomDictionary(goaway.DefaultProfanities, falsePositives, goaway.DefaultFalseNegatives)

	activeFilter.Store(&filterState{
		detector:     detector,
		blockedWords: cleanedBlocked,
		allowedWords: cleanedAllowed,
	})
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

// ContainsProfanity returns true if input matches any custom blocked word or built-in profanity.
func ContainsProfanity(input string) bool {
	return ExtractProfanity(input) != ""
}

// ExtractProfanity returns the matched blocked/profane term, or an empty string if clean.
func ExtractProfanity(input string) string {
	if input == "" {
		return ""
	}

	state := activeFilter.Load()
	lower := strings.ToLower(input)
	collapsed := strings.ReplaceAll(lower, " ", "")

	// 1. Strip explicitly allowed words/phrases first so they never trigger false positives
	for _, allowed := range state.allowedWords {
		lower = strings.ReplaceAll(lower, allowed, "")
		if compactAllowed := strings.ReplaceAll(allowed, " ", ""); compactAllowed != "" {
			collapsed = strings.ReplaceAll(collapsed, compactAllowed, "")
		}
	}

	// 2. Check custom blocked words directly (catches standalone words, sentences, and spaced variants)
	for _, blocked := range state.blockedWords {
		compactBlocked := strings.ReplaceAll(blocked, " ", "")
		if strings.Contains(lower, blocked) || (compactBlocked != "" && strings.Contains(collapsed, compactBlocked)) {
			return blocked
		}
	}

	// 3. Fall back to go-away for built-in profanities and leetspeak
	return state.detector.ExtractProfanity(input)
}
