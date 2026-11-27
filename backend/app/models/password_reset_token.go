package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type PasswordResetToken struct {
	ID        bson.ObjectID `bson:"_id" json:"id"`
	UserID    bson.ObjectID `bson:"user_id" json:"userId"`
	Email     string        `bson:"email" json:"email"`
	TokenHash string        `bson:"token_hash" json:"-"`
	ExpiresAt time.Time     `bson:"expires_at" json:"expiresAt"`
	CreatedAt time.Time     `bson:"created_at" json:"createdAt"`
}
