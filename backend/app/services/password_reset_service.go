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
	emailService      *EmailService
	cfg               config.Config
}

func NewPasswordResetService(
	userRepo repository.UserRepository,
	passwordResetRepo repository.PasswordResetRepository,
	refreshTokenRepo repository.RefreshTokenRepository,
	emailService *EmailService,
	cfg config.Config,
) *PasswordResetService {
	return &PasswordResetService{
		userRepo:          userRepo,
		passwordResetRepo: passwordResetRepo,
		refreshTokenRepo:  refreshTokenRepo,
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

func (s *PasswordResetService) ResetPassword(ctx context.Context, rawToken, newPassword string) error {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return apperrors.ErrInvalidPasswordResetToken
	}

	if err := validation.ValidatePassword(newPassword); err != nil {
		return err
	}

	sum := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(sum[:])

	tokenDoc, err := s.passwordResetRepo.FindValidByTokenHash(ctx, tokenHash)
	if err != nil {
		return err
	}

	user, err := s.userRepo.FindByID(ctx, tokenDoc.UserID.Hex())
	if err != nil {
		if errors.Is(err, apperrors.ErrUserNotFound) {
			return apperrors.ErrInvalidPasswordResetToken
		}
		return err
	}

	if !user.Status {
		return apperrors.ErrInvalidPasswordResetToken
	}

	// Ensure user didn't change their primary email after the reset link was issued
	if !strings.EqualFold(strings.TrimSpace(user.Email), tokenDoc.Email) {
		return apperrors.ErrInvalidPasswordResetToken
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if err := s.userRepo.UpdatePassword(ctx, user.ID.Hex(), string(passwordHash)); err != nil {
		return err
	}

	// Confirm email ownership since the user proved inbox access via the reset token
	if !user.EmailVerified {
		now := time.Now().UTC()
		user.PasswordHash = string(passwordHash)
		user.EmailVerified = true
		user.EmailVerifiedAt = &now
		if err := s.userRepo.Update(ctx, user); err != nil {
			return err
		}
	}

	// Revoke all existing sessions so stolen tokens cannot remain signed in
	if s.refreshTokenRepo != nil {
		_ = s.refreshTokenRepo.RevokeAllByUserID(ctx, user.ID.Hex())
	}

	return s.passwordResetRepo.DeleteByUserID(ctx, user.ID.Hex())
}
