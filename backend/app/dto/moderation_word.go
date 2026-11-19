package dto

import "movie-app/models"

type AddModerationWordsRequest struct {
	Words []string                  `json:"words" binding:"required,min=1"`
	Type  models.ModerationWordType `json:"type" binding:"required"`
}

type DeleteModerationWordsRequest struct {
	Words []string                  `json:"words" binding:"required,min=1"`
	Type  models.ModerationWordType `json:"type" binding:"required"`
}

type ModerationWordsResponse struct {
	Blocked []string `json:"blocked"`
	Allowed []string `json:"allowed"`
}
