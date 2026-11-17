package validation

import (
	"errors"
	"movie-app/sanitizer"
	"unicode/utf8"
)

const MaxBioLength = 500

func ValidateBio(bio string) (string, error) {
	bio = sanitizer.SanitizeStrict(bio)

	if utf8.RuneCountInString(bio) > MaxBioLength {
		return "", errors.New("bio cannot exceed 500 characters")
	}

	return bio, nil
}
