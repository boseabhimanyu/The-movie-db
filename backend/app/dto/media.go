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
