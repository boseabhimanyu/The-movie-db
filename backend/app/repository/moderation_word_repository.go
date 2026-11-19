package repository

import (
	"context"
	"movie-app/models"
)

type ModerationWordRepository interface {
	UpsertWords(ctx context.Context, words []string, wordType models.ModerationWordType, addedBy string) error
	DeleteWord(ctx context.Context, word string, wordType models.ModerationWordType) error
	GetAllGrouped(ctx context.Context) (blocked []string, allowed []string, err error)
}
