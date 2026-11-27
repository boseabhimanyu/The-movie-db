package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"movie-app/apperrors"
	"movie-app/config"
	"movie-app/models"
	"movie-app/repository"
	"movie-app/validation"

	"golang.org/x/crypto/bcrypt"
)

type PasswordResetService struct {
	userRepo          repository.UserRepository
	passwordResetRepo repository.PasswordResetRepository
	refreshTokenRepo  repository.RefreshTokenRepository
	userService       *UserService
	totpService       *TOTPService
	emailService      *EmailService
	cfg               config.Config
}

func NewPasswordResetService(
	userRepo repository.UserRepository,
	passwordResetRepo repository.PasswordResetRepository,
	refreshTokenRepo repository.RefreshTokenRepository,
	userService *UserService,
	totpService *TOTPService,
	emailService *EmailService,
	cfg config.Config,
) *PasswordResetService {
	return &PasswordResetService{
		userRepo:          userRepo,
		passwordResetRepo: passwordResetRepo,
		refreshTokenRepo:  refreshTokenRepo,
		userService:       userService,
		totpService:       totpService,
		emailService:      emailService,
		cfg:               cfg,
	}
}

// RequestReset resolves a user by email or username and sends a password reset link.
// Always returns nil for unknown/inactive users or active cooldowns to prevent account enumeration.
func (s *PasswordResetService) RequestReset(ctx context.Context, identifier string) error {
	identifier = strings.TrimSpace(identifier)
	if identifier == "" {
		return nil
	}

	var (
		user *models.User
		err  error
	)

	if strings.Contains(identifier, "@") {
		user, err = s.userRepo.FindByAnyEmail(ctx, strings.ToLower(identifier))
	} else {
		user, err = s.userRepo.FindByUsername(ctx, strings.ToLower(identifier))
	}

	if err != nil {
		if errors.Is(err, apperrors.ErrUserNotFound) {
			return nil
		}
		return err
	}

	if user == nil || !user.Status || strings.TrimSpace(user.Email) == "" {
		return nil
	}

	// Silent cooldown check to avoid leaking account existence
	if latest, err := s.passwordResetRepo.FindLatestByUserID(ctx, user.ID.Hex()); err == nil && latest != nil {
		cooldown := time.Duration(s.cfg.PasswordResetResendMinSec) * time.Second
		if time.Since(latest.CreatedAt) < cooldown {
			return nil
		}
	}

	rawToken, tokenHash, err := generateVerificationToken()
	if err != nil {
		return err
	}

	if err := s.passwordResetRepo.DeleteByUserID(ctx, user.ID.Hex()); err != nil {
		return err
	}

	now := time.Now().UTC()
	tokenDoc := &models.PasswordResetToken{
		UserID:    user.ID,
		Email:     strings.ToLower(strings.TrimSpace(user.Email)),
		TokenHash: tokenHash,
		ExpiresAt: now.Add(time.Duration(s.cfg.PasswordResetExpiryMinutes) * time.Minute),
		CreatedAt: now,
	}

	if err := s.passwordResetRepo.Create(ctx, tokenDoc); err != nil {
		return err
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.cfg.FrontendBaseURL, rawToken)
	return s.emailService.SendPasswordResetEmail(user.Email, user.FirstName, resetURL)
}

func (s *PasswordResetService) ResetPassword(
	ctx context.Context,
	rawToken string,
	newPassword string,
	code string,
) (bool, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return false, apperrors.ErrInvalidPasswordResetToken
	}

	if err := validation.ValidatePassword(newPassword); err != nil {
		return false, err
	}

	sum := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(sum[:])

	tokenDoc, err := s.passwordResetRepo.FindValidByTokenHash(ctx, tokenHash)
	if err != nil {
		return false, err
	}

	user, err := s.userRepo.FindByID(ctx, tokenDoc.UserID.Hex())
	if err != nil {
		if errors.Is(err, apperrors.ErrUserNotFound) {
			return false, apperrors.ErrInvalidPasswordResetToken
		}
		return false, err
	}

	if !user.Status {
		return false, apperrors.ErrInvalidPasswordResetToken
	}

	if !strings.EqualFold(strings.TrimSpace(user.Email), tokenDoc.Email) {
		return false, apperrors.ErrInvalidPasswordResetToken
	}

	// Enforce 2FA verification unconditionally if the user has 2FA enabled
	if user.TwoFactorEnabled {
		trimmedCode := strings.ToUpper(strings.TrimSpace(code))
		if trimmedCode == "" {
			return true, nil
		}

		if len(trimmedCode) == 6 {
			if strings.TrimSpace(user.TwoFactorSecret) == "" {
				return false, apperrors.ErrInvalidTOTPCode
			}

			totpEncryptionService, err := NewTOTPEncryptionService(s.cfg.TOTPEncryptionKey)
			if err != nil {
				return false, err
			}

			decryptedSecret, err := totpEncryptionService.Decrypt(user.TwoFactorSecret)
			if err != nil {
				return false, apperrors.ErrInvalidTOTPCode
			}

			if err := s.totpService.VerifyCode(decryptedSecret, trimmedCode); err != nil {
				return false, apperrors.ErrInvalidTOTPCode
			}
		} else {
			if _, err := s.userService.VerifyBackupCode(ctx, user.ID.Hex(), trimmedCode); err != nil {
				return false, apperrors.ErrInvalidBackupCode
			}
		}
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return false, err
	}

	if err := s.userRepo.UpdatePassword(ctx, user.ID.Hex(), string(passwordHash)); err != nil {
		return false, err
	}

	if !user.EmailVerified {
		now := time.Now().UTC()
		user.PasswordHash = string(passwordHash)
		user.EmailVerified = true
		user.EmailVerifiedAt = &now
		if err := s.userRepo.Update(ctx, user); err != nil {
			return false, err
		}
	}

	if s.refreshTokenRepo != nil {
		_ = s.refreshTokenRepo.RevokeAllByUserID(ctx, user.ID.Hex())
	}

	return false, s.passwordResetRepo.DeleteByUserID(ctx, user.ID.Hex())
}
