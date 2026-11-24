package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

var (
	ErrTOTPEncryptionKeyMissing           = errors.New("TOTP encryption key is required to enable 2FA")
	ErrTOTPEncryptionKeyTooWeak           = errors.New("TOTP encryption key must be at least 32 bytes")
	ErrBackupCodeCountTooLow              = errors.New("backup code count must be at least 8")
	ErrBackupCodeLowThresholdTooLow       = errors.New("backup code low threshold must be at least 4")
	ErrBackupCodeCountTooCloseToThreshold = errors.New("backup code count must be at least 4 greater than backup code low threshold")
)

type Config struct {
	MongoUri               string
	MongoDB                string
	ServerPort             string
	JWTSecret              string
	JWTExpiryHours         int
	RefreshTokenExpiryDays int

	AuthAccessCookie  string
	AuthRefreshCookie string

	CookieSecure                     bool
	GinMode                          string
	RefreshTokenRevokedRetentionDays int
	RefreshTokenExpiredRetentionDays int

	CookieSameSite         string
	AllowedOrigins         []string
	TOTPIssuer             string
	TOTPEncryptionKey      string
	BackupCodeCount        int
	BackupCodeLowThreshold int

	// Media APIs & Caching
	TraktClientID            string
	FanartAPIKey             string
	MediaCacheTTLHours       int
	MediaBatchSyncLimit      int
	MediaFeedCacheTTLMinutes int
	PersonCacheTTLHours      int

	//Email service
	FrontendBaseURL               string
	SMTPHost                      string
	SMTPPort                      int
	SMTPUsername                  string
	SMTPPassword                  string
	SMTPFromEmail                 string
	SMTPFromName                  string
	EmailVerificationExpiryHours  int
	EmailVerificationResendMinSec int
}

func Load() (Config, error) {
	paths := []string{
		".env",
	}

	for _, p := range paths {
		if err := godotenv.Load(p); err == nil {
			break
		}
	}

	mongoURI, err := extractEnv("MONGO_URI")
	if err != nil {
		return Config{}, err
	}

	mongoDB, err := extractEnv("MONGO_DB_NAME")
	if err != nil {
		return Config{}, err
	}

	port, err := extractEnv("PORT")
	if err != nil {
		return Config{}, err
	}

	jwtSecret, err := extractEnv("JWT_SECRET")
	if err != nil {
		return Config{}, err
	}

	jwtExpiryHoursStr, err := extractEnv("JWT_EXPIRY_HOURS")
	if err != nil {
		return Config{}, err
	}

	jwtExpiryHours, err := strconv.Atoi(jwtExpiryHoursStr)
	if err != nil {
		return Config{}, fmt.Errorf(
			"invalid JWT_EXPIRY_HOURS: %w",
			err,
		)
	}

	refreshTokenExpiryDaysStr, err := extractEnv(
		"REFRESH_TOKEN_EXPIRY_DAYS",
	)
	if err != nil {
		return Config{}, err
	}

	refreshTokenExpiryDays, err := strconv.Atoi(
		refreshTokenExpiryDaysStr,
	)
	if err != nil {
		return Config{}, fmt.Errorf(
			"invalid REFRESH_TOKEN_EXPIRY_DAYS: %w",
			err,
		)
	}

	// Access cookie name
	authAccessCookie, err := extractEnv(
		"AUTH_ACCESS_COOKIE",
	)
	if err != nil {
		return Config{}, err
	}

	// Refresh cookie name
	authRefreshCookie, err := extractEnv(
		"AUTH_REFRESH_COOKIE",
	)
	if err != nil {
		return Config{}, err
	}

	cookieSecureStr, err := extractEnv("COOKIE_SECURE")
	if err != nil {
		return Config{}, err
	}

	cookieSecure, err := strconv.ParseBool(cookieSecureStr)
	if err != nil {
		return Config{}, fmt.Errorf(
			"invalid COOKIE_SECURE: %w",
			err,
		)
	}

	// Cookie SameSite
	cookieSameSite, err := extractEnv(
		"COOKIE_SAME_SITE",
	)
	if err != nil {
		return Config{}, err
	}

	// Normalize Cookie SameSite value.
	switch strings.ToLower(cookieSameSite) {
	case "strict":
		cookieSameSite = "Strict"
	case "lax":
		cookieSameSite = "Lax"
	case "none":
		cookieSameSite = "None"
	default:
		return Config{}, errors.New(
			"COOKIE_SAME_SITE must be one of: Strict, Lax, None",
		)
	}

	// SameSite=None requires Secure=true.
	if cookieSameSite == "None" && !cookieSecure {
		return Config{}, errors.New(
			"COOKIE_SAME_SITE=None requires COOKIE_SECURE=true",
		)
	}

	ginMode, err := extractEnv("GIN_MODE")
	if err != nil {
		return Config{}, err
	}

	allowedOriginsStr, err := extractEnv("ALLOWED_ORIGINS")
	if err != nil {
		return Config{}, err
	}

	allowedOrigins := strings.Split(
		allowedOriginsStr,
		",",
	)

	for i := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(
			allowedOrigins[i],
		)

		if allowedOrigins[i] == "" {
			return Config{}, errors.New(
				"ALLOWED_ORIGINS contains an empty origin",
			)
		}
	}

	// Refresh token revoked retention.
	// Defaults to 7 days when the environment variable is not set.
	refreshTokenRevokedRetentionDays := 7

	retentionDaysStr := strings.TrimSpace(
		os.Getenv("REFRESH_TOKEN_REVOKED_RETENTION_DAYS"),
	)

	if retentionDaysStr != "" {
		refreshTokenRevokedRetentionDays, err = strconv.Atoi(
			retentionDaysStr,
		)
		if err != nil {
			return Config{}, fmt.Errorf(
				"invalid REFRESH_TOKEN_REVOKED_RETENTION_DAYS: %w",
				err,
			)
		}
	}

	// Refresh token expired retention.
	// Defaults to 7 days when the environment variable is not set.
	refreshTokenExpiredRetentionDays := 7

	retentionDaysExpiredStr := strings.TrimSpace(
		os.Getenv("REFRESH_TOKEN_EXPIRED_RETENTION_DAYS"),
	)

	if retentionDaysExpiredStr != "" {
		refreshTokenExpiredRetentionDays, err = strconv.Atoi(
			retentionDaysExpiredStr,
		)
		if err != nil {
			return Config{}, fmt.Errorf(
				"invalid REFRESH_TOKEN_EXPIRED_RETENTION_DAYS: %w",
				err,
			)
		}
	}

	tOTPIssuer, err := extractEnv("TOTP_ISSUER")
	if err != nil {
		return Config{}, err
	}

	// TOTP encryption key is intentionally optional at startup.
	// It is required only when 2FA is enabled or used.
	tOTPEncryptionKey := strings.TrimSpace(
		os.Getenv("TOTP_ENCRYPTION_KEY"),
	)

	// Backup code settings.
	// Defaults:
	//   BACKUP_CODE_COUNT=10
	//   BACKUP_CODE_LOW_THRESHOLD=4
	backupCodeCount := 10

	backupCodeCountStr := strings.TrimSpace(
		os.Getenv("BACKUP_CODE_COUNT"),
	)

	if backupCodeCountStr != "" {
		backupCodeCount, err = strconv.Atoi(backupCodeCountStr)
		if err != nil {
			return Config{}, fmt.Errorf(
				"invalid BACKUP_CODE_COUNT: %w",
				err,
			)
		}
	}

	backupCodeLowThreshold := 4

	backupCodeLowThresholdStr := strings.TrimSpace(
		os.Getenv("BACKUP_CODE_LOW_THRESHOLD"),
	)

	if backupCodeLowThresholdStr != "" {
		backupCodeLowThreshold, err = strconv.Atoi(
			backupCodeLowThresholdStr,
		)
		if err != nil {
			return Config{}, fmt.Errorf(
				"invalid BACKUP_CODE_LOW_THRESHOLD: %w",
				err,
			)
		}
	}

	// Trakt & Fanart.tv API credentials
	traktClientID, err := extractEnv("TRAKT_CLIENT_ID")
	if err != nil {
		return Config{}, err
	}

	fanartAPIKey, err := extractEnv("FANART_API_KEY")
	if err != nil {
		return Config{}, err
	}

	// Media cache TTL in hours (defaults to 24 hours).
	mediaCacheTTLHours := 24
	mediaCacheTTLStr := strings.TrimSpace(
		os.Getenv("MEDIA_CACHE_TTL_HOURS"),
	)
	if mediaCacheTTLStr != "" {
		mediaCacheTTLHours, err = strconv.Atoi(mediaCacheTTLStr)
		if err != nil {
			return Config{}, fmt.Errorf(
				"invalid MEDIA_CACHE_TTL_HOURS: %w",
				err,
			)
		}
	}

	batchLimit := 10
	if val := strings.TrimSpace(os.Getenv("MEDIA_BATCH_SYNC_LIMIT")); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil && parsed > 0 {
			batchLimit = parsed
		}
	}

	feedTTLMinutes := 15
	if val := strings.TrimSpace(os.Getenv("MEDIA_FEED_CACHE_TTL_MINUTES")); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil && parsed > 0 {
			feedTTLMinutes = parsed
		}
	}

	personCacheTTLHours := 168 // defaults to 7 days
	personCacheTTLStr := strings.TrimSpace(
		os.Getenv("PERSON_CACHE_TTL_HOURS"),
	)
	if personCacheTTLStr != "" {
		personCacheTTLHours, err = strconv.Atoi(personCacheTTLStr)
		if err != nil {
			return Config{}, fmt.Errorf(
				"invalid PERSON_CACHE_TTL_HOURS: %w",
				err,
			)
		}
	}

	frontendBaseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("FRONTEND_BASE_URL")), "/")
	if frontendBaseURL == "" {
		frontendBaseURL = allowedOrigins[0]
	}

	smtpHost := strings.TrimSpace(os.Getenv("SMTP_HOST"))
	smtpPort := 587
	if val := strings.TrimSpace(os.Getenv("SMTP_PORT")); val != "" {
		parsed, err := strconv.Atoi(val)
		if err != nil || parsed <= 0 {
			return Config{}, fmt.Errorf("invalid SMTP_PORT: %w", err)
		}
		smtpPort = parsed
	}
	smtpUsername := strings.TrimSpace(os.Getenv("SMTP_USERNAME"))
	smtpPassword := strings.TrimSpace(os.Getenv("SMTP_PASSWORD"))
	smtpFromEmail := strings.TrimSpace(os.Getenv("SMTP_FROM_EMAIL"))
	smtpFromName := strings.TrimSpace(os.Getenv("SMTP_FROM_NAME"))
	if smtpFromName == "" {
		smtpFromName = "Movie App"
	}

	emailVerificationExpiryHours := 24
	if val := strings.TrimSpace(os.Getenv("EMAIL_VERIFICATION_EXPIRY_HOURS")); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil && parsed > 0 {
			emailVerificationExpiryHours = parsed
		}
	}

	emailVerificationResendMinSec := 60
	if val := strings.TrimSpace(os.Getenv("EMAIL_VERIFICATION_RESEND_MIN_SECONDS")); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil && parsed > 0 {
			emailVerificationResendMinSec = parsed
		}
	}

	config := Config{
		MongoUri:                         mongoURI,
		MongoDB:                          mongoDB,
		ServerPort:                       port,
		JWTSecret:                        jwtSecret,
		JWTExpiryHours:                   jwtExpiryHours,
		AuthAccessCookie:                 authAccessCookie,
		AuthRefreshCookie:                authRefreshCookie,
		RefreshTokenExpiryDays:           refreshTokenExpiryDays,
		CookieSecure:                     cookieSecure,
		GinMode:                          ginMode,
		RefreshTokenRevokedRetentionDays: refreshTokenRevokedRetentionDays,
		RefreshTokenExpiredRetentionDays: refreshTokenExpiredRetentionDays,
		CookieSameSite:                   cookieSameSite,
		AllowedOrigins:                   allowedOrigins,
		TOTPIssuer:                       tOTPIssuer,
		TOTPEncryptionKey:                tOTPEncryptionKey,
		BackupCodeCount:                  backupCodeCount,
		BackupCodeLowThreshold:           backupCodeLowThreshold,
		TraktClientID:                    traktClientID,
		FanartAPIKey:                     fanartAPIKey,
		MediaCacheTTLHours:               mediaCacheTTLHours,
		MediaBatchSyncLimit:              batchLimit,
		MediaFeedCacheTTLMinutes:         feedTTLMinutes,
		PersonCacheTTLHours:              personCacheTTLHours,
		FrontendBaseURL:                  frontendBaseURL,
		SMTPHost:                         smtpHost,
		SMTPPort:                         smtpPort,
		SMTPUsername:                     smtpUsername,
		SMTPPassword:                     smtpPassword,
		SMTPFromEmail:                    smtpFromEmail,
		SMTPFromName:                     smtpFromName,
		EmailVerificationExpiryHours:     emailVerificationExpiryHours,
		EmailVerificationResendMinSec:    emailVerificationResendMinSec,
	}

	if err := config.Validate(); err != nil {
		return Config{}, err
	}

	return config, nil
}

// Validate validates the loaded configuration.
func (c Config) Validate() error {
	if c.MongoUri == "" {
		return errors.New("mongo uri missing")
	}

	if c.MongoDB == "" {
		return errors.New("mongo database missing")
	}

	if c.ServerPort == "" {
		return errors.New("server port missing")
	}

	if c.JWTSecret == "" {
		return errors.New("jwt secret missing")
	}

	if c.JWTExpiryHours <= 0 {
		return errors.New(
			"jwt expiry hours must be greater than zero",
		)
	}

	if c.RefreshTokenExpiryDays <= 0 {
		return errors.New(
			"refresh token expiry days must be greater than zero",
		)
	}

	if c.RefreshTokenRevokedRetentionDays <= 0 {
		return errors.New(
			"refresh token revoked retention days must be greater than zero",
		)
	}

	if c.RefreshTokenExpiredRetentionDays <= 0 {
		return errors.New(
			"refresh token expired retention days must be greater than zero",
		)
	}

	if c.AuthAccessCookie == "" {
		return errors.New(
			"access token cookie name is missing",
		)
	}

	if c.AuthRefreshCookie == "" {
		return errors.New(
			"refresh token cookie name is missing",
		)
	}

	if c.GinMode == "" {
		return errors.New("Gin mode is missing")
	}

	if c.CookieSameSite == "" {
		return errors.New(
			"cookie SameSite setting is missing",
		)
	}

	// Validate supported SameSite values.
	switch c.CookieSameSite {
	case "Strict", "Lax", "None":
	default:
		return errors.New(
			"cookie SameSite must be one of: Strict, Lax, None",
		)
	}

	// SameSite=None requires Secure=true.
	if c.CookieSameSite == "None" && !c.CookieSecure {
		return errors.New(
			"cookie SameSite=None requires CookieSecure=true",
		)
	}

	if len(c.AllowedOrigins) == 0 {
		return errors.New("ALLOWED_ORIGINS missing")
	}

	// Validate that every configured origin is non-empty.
	for _, origin := range c.AllowedOrigins {
		if strings.TrimSpace(origin) == "" {
			return errors.New(
				"ALLOWED_ORIGINS contains an empty origin",
			)
		}
	}

	if strings.TrimSpace(c.TOTPIssuer) == "" {
		return errors.New("TOTP issuer is required")
	}

	if strings.TrimSpace(c.TraktClientID) == "" {
		return errors.New("TRAKT_CLIENT_ID is required")
	}

	if strings.TrimSpace(c.FanartAPIKey) == "" {
		return errors.New("FANART_API_KEY is required")
	}

	if c.MediaCacheTTLHours <= 0 {
		return errors.New("MEDIA_CACHE_TTL_HOURS must be greater than zero")
	}

	if c.PersonCacheTTLHours <= 0 {
		return errors.New("PERSON_CACHE_TTL_HOURS must be greater than zero")
	}

	return nil
}

func extractEnv(key string) (string, error) {
	val := strings.TrimSpace(os.Getenv(key))

	if val == "" {
		return "", fmt.Errorf(
			"missing required environment variable: %s",
			key,
		)
	}

	return val, nil
}

// ValidateTOTPEncryptionKey validates the encryption secret
// before 2FA is enabled or used.

func (c Config) ValidateTOTPEncryptionKey() error {
	key := strings.TrimSpace(c.TOTPEncryptionKey)

	if key == "" {
		return ErrTOTPEncryptionKeyMissing
	}

	if len([]byte(key)) < 32 {
		return ErrTOTPEncryptionKeyTooWeak
	}

	return nil
}

func (c Config) ValidateBackupCodeConfig() error {
	if c.BackupCodeLowThreshold < 4 {
		return ErrBackupCodeLowThresholdTooLow
	}

	if c.BackupCodeCount < 8 {
		return ErrBackupCodeCountTooLow
	}

	if c.BackupCodeCount < c.BackupCodeLowThreshold+4 {
		return ErrBackupCodeCountTooCloseToThreshold
	}

	return nil
}
