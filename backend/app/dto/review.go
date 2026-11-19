package dto

import (
	"movie-app/models"
	"time"
)

type CreateReviewRequest struct {
	Rating    int    `json:"rating"`
	Title     string `json:"title"`
	Body      string `json:"body"`
	IsSpoiler bool   `json:"isSpoiler"`
}

type PatchReviewRequest struct {
	Rating    *int    `json:"rating"`
	Title     *string `json:"title"`
	Body      *string `json:"body"`
	IsSpoiler *bool   `json:"isSpoiler"`
}

type ReviewAuthorResponse struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Username string `json:"username"`
	// Avatar   string `json:"avatar"`
}

type ReviewMediaSummary struct {
	ID     string           `json:"id"`
	Type   models.MediaType `json:"type"`
	Slug   string           `json:"slug"`
	Title  string           `json:"title"`
	Year   int              `json:"year"`
	Poster string           `json:"poster"`
}

type ReviewResponse struct {
	ID           string               `json:"id"`
	User         ReviewAuthorResponse `json:"user"`
	MediaType    models.MediaType     `json:"mediaType"`
	MediaID      string               `json:"mediaId"`
	Media        *ReviewMediaSummary  `json:"media"`
	Rating       int                  `json:"rating"`
	Title        string               `json:"title"`
	Body         string               `json:"body"`
	IsSpoiler    bool                 `json:"isSpoiler"`
	HelpfulCount int                  `json:"helpfulCount"`
	IsHelpful    bool                 `json:"isHelpful"`
	IsOwner      bool                 `json:"isOwner"`
	CreatedAt    time.Time            `json:"createdAt"`
	UpdatedAt    time.Time            `json:"updatedAt"`
}

type MediaReviewsListResponse struct {
	Stats      models.MediaRatingStats `json:"stats"`
	MyReview   *ReviewResponse         `json:"myReview"`
	Results    []ReviewResponse        `json:"results"`
	Pagination PaginationResponse      `json:"pagination"`
}
