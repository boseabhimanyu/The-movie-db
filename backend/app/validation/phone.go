package validation

import (
	"errors"
	"strings"

	"github.com/nyaruka/phonenumbers"
)

func ValidatePhone(phone string) (string, error) {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return "", nil
	}

	if !strings.HasPrefix(phone, "+") {
		return "", errors.New("phone number must include country code starting with '+' (e.g. +919876543210)")
	}

	parsed, err := phonenumbers.Parse(phone, "")
	if err != nil {
		return "", errors.New("invalid international phone number format")
	}

	if !phonenumbers.IsValidNumber(parsed) {
		return "", errors.New("invalid phone number for the specified country code")
	}

	return phonenumbers.Format(parsed, phonenumbers.E164), nil
}
