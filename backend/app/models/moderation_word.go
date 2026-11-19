package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type ModerationWordType string

const (
	WordTypeBlocked ModerationWordType = "blocked"
	WordTypeAllowed ModerationWordType = "allowed"
)

type ModerationWord struct {
	ID        bson.ObjectID      `bson:"_id,omitempty"`
	Word      string             `bson:"word"`    // Stored lowercase & trimmed
	Type      ModerationWordType `bson:"type"`    // "blocked" or "allowed"
	AddedBy   string             `bson:"addedBy"` // Admin userID (optional for seeded words)
	CreatedAt time.Time          `bson:"createdAt"`
}
