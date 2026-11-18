package dto

import "movie-app/models"

type PaginationResponse struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalPages int `json:"totalPages"`
	TotalItems int `json:"totalItems"`
}

type TrendingMovieResult struct {
	Watchers int          `json:"watchers"`
	Movie    models.Movie `json:"movie"`
}

type TrendingShowResult struct {
	Watchers int         `json:"watchers"`
	Show     models.Show `json:"show"`
}

type MovieListResponse struct {
	Movies     []models.Movie     `json:"movies"`
	Pagination PaginationResponse `json:"pagination"`
}

type TrendingMoviesResponse struct {
	Results    []TrendingMovieResult `json:"results"`
	Pagination PaginationResponse    `json:"pagination"`
}

type ShowListResponse struct {
	Shows      []models.Show      `json:"shows"`
	Pagination PaginationResponse `json:"pagination"`
}

type TrendingShowsResponse struct {
	Results    []TrendingShowResult `json:"results"`
	Pagination PaginationResponse   `json:"pagination"`
}

type BatchSyncRequest struct {
	IDs []string `json:"ids" binding:"required,min=1,max=15"`
}

type BatchSyncItemResult struct {
	Input   string `json:"input"`
	Success bool   `json:"success"`
	Title   string `json:"title,omitempty"`
	Slug    string `json:"slug,omitempty"`
	Error   string `json:"error,omitempty"`
}

type BatchSyncResponse struct {
	SyncedCount int                   `json:"syncedCount"`
	FailedCount int                   `json:"failedCount"`
	Results     []BatchSyncItemResult `json:"results"`
}

type AdminMovieSearchItem struct {
	Movie   models.Movie `json:"movie"`
	InDB    bool         `json:"inDb"`
	IsStale bool         `json:"isStale"`
}

type AdminShowSearchItem struct {
	Show    models.Show `json:"show"`
	InDB    bool        `json:"inDb"`
	IsStale bool        `json:"isStale"`
}
