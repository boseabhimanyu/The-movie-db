package repository

import (
	"context"
	"movie-app/models"
)

type EmailVerificationRepository interface {
	Create(ctx context.Context, token *models.EmailVerificationToken) error
	FindValidByTokenHash(ctx context.Context, tokenHash string) (*models.EmailVerificationToken, error)
	FindLatestByUserID(ctx context.Context, userID string) (*models.EmailVerificationToken, error)
	DeleteByUserID(ctx context.Context, userID string) error
}
