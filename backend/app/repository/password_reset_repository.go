package repository

import (
	"context"

	"movie-app/models"
)

type PasswordResetRepository interface {
	Create(ctx context.Context, token *models.PasswordResetToken) error
	FindValidByTokenHash(ctx context.Context, tokenHash string) (*models.PasswordResetToken, error)
	FindLatestByUserID(ctx context.Context, userID string) (*models.PasswordResetToken, error)
	DeleteByUserID(ctx context.Context, userID string) error
}
