package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"movie-app/apperrors"
	"movie-app/config"
	"movie-app/models"
	"movie-app/repository"
	"strings"
	"time"
)

type EmailVerificationService struct {
	userRepo         repository.UserRepository
	verificationRepo repository.EmailVerificationRepository
	emailService     *EmailService
	cfg              config.Config
}

func NewEmailVerificationService(
	userRepo repository.UserRepository,
	verificationRepo repository.EmailVerificationRepository,
	emailService *EmailService,
	cfg config.Config,
) *EmailVerificationService {
	return &EmailVerificationService{
		userRepo:         userRepo,
		verificationRepo: verificationRepo,
		emailService:     emailService,
		cfg:              cfg,
	}
}

func (s *EmailVerificationService) SendVerification(ctx context.Context, userID string) error {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	if !user.Status {
		return apperrors.ErrInvalidCredentials
	}

	if user.EmailVerified {
		return apperrors.ErrEmailAlreadyVerified
	}

	// Enforce resend cooldown
	if latest, err := s.verificationRepo.FindLatestByUserID(ctx, user.ID.Hex()); err == nil && latest != nil {
		cooldown := time.Duration(s.cfg.EmailVerificationResendMinSec) * time.Second
		if time.Since(latest.CreatedAt) < cooldown {
			return apperrors.ErrVerificationEmailTooSoon
		}
	}

	rawToken, tokenHash, err := generateVerificationToken()
	if err != nil {
		return err
	}

	// Invalidate previous tokens for this user
	if err := s.verificationRepo.DeleteByUserID(ctx, user.ID.Hex()); err != nil {
		return err
	}

	now := time.Now().UTC()
	tokenDoc := &models.EmailVerificationToken{
		UserID:    user.ID,
		Email:     strings.ToLower(strings.TrimSpace(user.Email)),
		TokenHash: tokenHash,
		ExpiresAt: now.Add(time.Duration(s.cfg.EmailVerificationExpiryHours) * time.Hour),
		CreatedAt: now,
	}

	if err := s.verificationRepo.Create(ctx, tokenDoc); err != nil {
		return err
	}

	verifyURL := fmt.Sprintf("%s/verify-email?token=%s", s.cfg.FrontendBaseURL, rawToken)
	return s.emailService.SendVerificationEmail(user.Email, user.FirstName, verifyURL)
}

func (s *EmailVerificationService) VerifyToken(ctx context.Context, rawToken string) error {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return apperrors.ErrInvalidEmailVerificationToken
	}

	sum := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(sum[:])

	tokenDoc, err := s.verificationRepo.FindValidByTokenHash(ctx, tokenHash)
	if err != nil {
		return err
	}

	user, err := s.userRepo.FindByID(ctx, tokenDoc.UserID.Hex())
	if err != nil {
		if errors.Is(err, apperrors.ErrUserNotFound) {
			return apperrors.ErrInvalidEmailVerificationToken
		}
		return err
	}

	// Ensure user didn't change their email after token was issued
	if !strings.EqualFold(strings.TrimSpace(user.Email), tokenDoc.Email) {
		return apperrors.ErrInvalidEmailVerificationToken
	}

	if !user.EmailVerified {
		now := time.Now().UTC()
		user.EmailVerified = true
		user.EmailVerifiedAt = &now
		if err := s.userRepo.Update(ctx, user); err != nil {
			return err
		}
	}

	return s.verificationRepo.DeleteByUserID(ctx, user.ID.Hex())
}

func generateVerificationToken() (string, string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	raw := hex.EncodeToString(b)
	sum := sha256.Sum256([]byte(raw))
	return raw, hex.EncodeToString(sum[:]), nil
}
