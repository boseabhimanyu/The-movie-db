package handler

import (
	"errors"
	"movie-app/apperrors"
	"movie-app/dto"
	"movie-app/models"
	"movie-app/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ModerationWordHandler struct {
	service *services.ModerationWordService
}

func NewModerationWordHandler(service *services.ModerationWordService) *ModerationWordHandler {
	return &ModerationWordHandler{service: service}
}

// GET /admin/moderation/words
func (h *ModerationWordHandler) ListWords(c *gin.Context) {
	res, err := h.service.ListWords(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch moderation words"})
		return
	}
	c.JSON(http.StatusOK, res)
}

// POST /admin/moderation/words
func (h *ModerationWordHandler) AddWords(c *gin.Context) {
	var req dto.AddModerationWordsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "words (non-empty array) and type ('blocked' or 'allowed') are required"})
		return
	}

	adminUserID := c.GetString("userID")

	res, err := h.service.AddWords(c.Request.Context(), adminUserID, req)
	if err != nil {
		handleModerationWordError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

// DELETE /admin/moderation/words?word=example&type=blocked
func (h *ModerationWordHandler) DeleteWord(c *gin.Context) {
	req := dto.DeleteModerationWordRequest{
		Word: c.Query("word"),
		Type: models.ModerationWordType(c.Query("type")),
	}

	res, err := h.service.RemoveWord(c.Request.Context(), req)
	if err != nil {
		handleModerationWordError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

func handleModerationWordError(c *gin.Context, err error) {
	if errors.Is(err, apperrors.ErrInvalidReviewInput) {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update moderation words"})
}
