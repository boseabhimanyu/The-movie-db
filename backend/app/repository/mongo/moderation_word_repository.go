package mongo

import (
	"context"
	"movie-app/models"
	"movie-app/repository"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const moderationWordCollection = "moderation_words"

type ModerationWordRepository struct {
	collection *mongo.Collection
}

func NewModerationWordRepository(db *mongo.Database) repository.ModerationWordRepository {
	return &ModerationWordRepository{
		collection: db.Collection(moderationWordCollection),
	}
}

func (r *ModerationWordRepository) UpsertWords(
	ctx context.Context,
	words []string,
	wordType models.ModerationWordType,
	addedBy string,
) error {
	if len(words) == 0 {
		return nil
	}

	now := time.Now().UTC()
	writes := make([]mongo.WriteModel, 0, len(words))

	for _, w := range words {
		cleaned := strings.ToLower(strings.TrimSpace(w))
		if cleaned == "" {
			continue
		}

		model := mongo.NewUpdateOneModel().
			SetFilter(bson.M{"word": cleaned, "type": wordType}).
			SetUpdate(bson.M{
				"$setOnInsert": bson.M{
					"word":      cleaned,
					"type":      wordType,
					"addedBy":   addedBy,
					"createdAt": now,
				},
			}).
			SetUpsert(true)

		writes = append(writes, model)
	}

	if len(writes) == 0 {
		return nil
	}

	_, err := r.collection.BulkWrite(ctx, writes, options.BulkWrite().SetOrdered(false))
	return err
}

func (r *ModerationWordRepository) DeleteWord(
	ctx context.Context,
	word string,
	wordType models.ModerationWordType,
) error {
	cleaned := strings.ToLower(strings.TrimSpace(word))
	_, err := r.collection.DeleteOne(ctx, bson.M{"word": cleaned, "type": wordType})
	return err
}

func (r *ModerationWordRepository) GetAllGrouped(ctx context.Context) (blocked []string, allowed []string, err error) {
	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, nil, err
	}
	defer cursor.Close(ctx)

	var docs []models.ModerationWord
	if err := cursor.All(ctx, &docs); err != nil {
		return nil, nil, err
	}

	for _, d := range docs {
		switch d.Type {
		case models.WordTypeBlocked:
			blocked = append(blocked, d.Word)
		case models.WordTypeAllowed:
			allowed = append(allowed, d.Word)
		}
	}
	return blocked, allowed, nil
}
