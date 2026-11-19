package handler

import (
	"errors"
	"movie-app/apperrors"
	"movie-app/dto"
	"movie-app/models"
	"movie-app/repository"
	"movie-app/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ReviewHandler struct {
	reviewService *services.ReviewService
}

func NewReviewHandler(reviewService *services.ReviewService) *ReviewHandler {
	return &ReviewHandler{reviewService: reviewService}
}

func (h *ReviewHandler) CreateMovieReview(c *gin.Context) {
	h.createMediaReview(c, models.MediaTypeMovie)
}

func (h *ReviewHandler) CreateShowReview(c *gin.Context) {
	h.createMediaReview(c, models.MediaTypeShow)
}

func (h *ReviewHandler) createMediaReview(c *gin.Context, mediaType models.MediaType) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	res, err := h.reviewService.CreateReview(c.Request.Context(), userID, mediaType, c.Param("id"), req)
	if err != nil {
		handleReviewError(c, err)
		return
	}

	c.JSON(http.StatusCreated, res)
}

func (h *ReviewHandler) PatchMovieReview(c *gin.Context) {
	h.patchMediaReview(c, models.MediaTypeMovie)
}

func (h *ReviewHandler) PatchShowReview(c *gin.Context) {
	h.patchMediaReview(c, models.MediaTypeShow)
}

func (h *ReviewHandler) patchMediaReview(c *gin.Context, mediaType models.MediaType) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.PatchReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	res, err := h.reviewService.PatchReviewByMedia(c.Request.Context(), userID, mediaType, c.Param("id"), req)
	if err != nil {
		handleReviewError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *ReviewHandler) PatchReviewByID(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.PatchReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	res, err := h.reviewService.PatchReviewByID(c.Request.Context(), c.Param("reviewId"), userID, req)
	if err != nil {
		handleReviewError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *ReviewHandler) GetMovieReviews(c *gin.Context) {
	h.getMediaReviews(c, models.MediaTypeMovie)
}

func (h *ReviewHandler) GetShowReviews(c *gin.Context) {
	h.getMediaReviews(c, models.MediaTypeShow)
}

func (h *ReviewHandler) getMediaReviews(c *gin.Context, mediaType models.MediaType) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	sort := repository.ReviewSort(c.DefaultQuery("sort", "recent"))
	onlyWritten := c.DefaultQuery("onlyWritten", "false") == "true"
	viewerID := c.GetString("userID")

	res, err := h.reviewService.GetMediaReviews(
		c.Request.Context(),
		mediaType,
		c.Param("id"),
		viewerID,
		sort,
		onlyWritten,
		page,
		limit,
	)
	if err != nil {
		handleReviewError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *ReviewHandler) GetMyReviews(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	mediaType := models.MediaType(c.Query("mediaType"))

	results, pagination, err := h.reviewService.GetUserReviews(
		c.Request.Context(),
		userID,
		userID,
		mediaType,
		page,
		limit,
	)
	if err != nil {
		handleReviewError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"results":    results,
		"pagination": pagination,
	})
}

func (h *ReviewHandler) GetUserReviews(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	mediaType := models.MediaType(c.Query("mediaType"))
	viewerID := c.GetString("userID")

	results, pagination, err := h.reviewService.GetUserReviews(
		c.Request.Context(),
		c.Param("userId"),
		viewerID,
		mediaType,
		page,
		limit,
	)
	if err != nil {
		handleReviewError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"results":    results,
		"pagination": pagination,
	})
}

func (h *ReviewHandler) ToggleHelpful(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	review, added, err := h.reviewService.ToggleHelpful(c.Request.Context(), c.Param("reviewId"), userID)
	if err != nil {
		handleReviewError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"helpful": added,
		"review":  review,
	})
}

func (h *ReviewHandler) DeleteReview(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	isAdmin := c.GetString("role") == "admin"
	if err := h.reviewService.DeleteReview(c.Request.Context(), c.Param("reviewId"), userID, isAdmin); err != nil {
		handleReviewError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "review deleted"})
}

func handleReviewError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, apperrors.ErrInvalidReviewInput):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, apperrors.ErrReviewAlreadyExists):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, apperrors.ErrMediaNotFound), errors.Is(err, apperrors.ErrReviewNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, apperrors.ErrReviewForbidden), errors.Is(err, apperrors.ErrSelfHelpfulVote):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
	}
}
