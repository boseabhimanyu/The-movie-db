package services

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"movie-app/apperrors"
	"movie-app/dto"
	"movie-app/models"
	"movie-app/repository"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type BookmarkListOptions struct {
	UserID    string
	MediaType *models.BookmarkMediaType
	Page      int
	Limit     int
}

type BookmarkService struct {
	bookmarkRepository repository.BookmarkRepository
	movieRepository    repository.MovieRepository
	showRepository     repository.ShowRepository
}

func NewBookmarkService(
	bookmarkRepository repository.BookmarkRepository,
	movieRepository repository.MovieRepository,
	showRepository repository.ShowRepository,
) *BookmarkService {
	return &BookmarkService{
		bookmarkRepository: bookmarkRepository,
		movieRepository:    movieRepository,
		showRepository:     showRepository,
	}
}

func (s *BookmarkService) Add(
	ctx context.Context,
	userID string,
	req *dto.AddBookmarkRequest,
) (*dto.BookmarkItem, error) {
	userObjID, err := bson.ObjectIDFromHex(strings.TrimSpace(userID))
	if err != nil {
		return nil, apperrors.ErrInvalidUserID
	}

	if !isValidBookmarkMediaType(req.MediaType) {
		return nil, apperrors.ErrInvalidMediaType
	}

	canonicalID, err := s.resolveCanonicalMediaID(ctx, req.MediaType, req.MediaID)
	if err != nil {
		return nil, err
	}

	bookmark := &models.Bookmark{
		UserID:    userObjID,
		MediaType: req.MediaType,
		MediaID:   canonicalID,
	}

	saved, err := s.bookmarkRepository.Upsert(ctx, bookmark)
	if err != nil {
		return nil, err
	}

	item := dto.ToBookmarkItem(saved)
	return &item, nil
}

func (s *BookmarkService) Remove(
	ctx context.Context,
	userID string,
	mediaType models.BookmarkMediaType,
	mediaID string,
) error {
	if !isValidBookmarkMediaType(mediaType) {
		return apperrors.ErrInvalidMediaType
	}

	canonicalID, err := s.resolveCanonicalMediaID(ctx, mediaType, mediaID)
	if err != nil {
		if errors.Is(err, apperrors.ErrMediaNotFound) {
			return apperrors.ErrBookmarkNotFound
		}
		return err
	}

	deleted, err := s.bookmarkRepository.Delete(ctx, strings.TrimSpace(userID), mediaType, canonicalID)
	if err != nil {
		return err
	}

	if !deleted {
		return apperrors.ErrBookmarkNotFound
	}

	return nil
}

func (s *BookmarkService) IsBookmarked(
	ctx context.Context,
	userID string,
	mediaType models.BookmarkMediaType,
	mediaID string,
) (bool, error) {
	if !isValidBookmarkMediaType(mediaType) {
		return false, apperrors.ErrInvalidMediaType
	}

	canonicalID, err := s.resolveCanonicalMediaID(ctx, mediaType, mediaID)
	if err != nil {
		return false, err
	}

	return s.bookmarkRepository.IsBookmarked(ctx, strings.TrimSpace(userID), mediaType, canonicalID)
}

func (s *BookmarkService) List(
	ctx context.Context,
	opts BookmarkListOptions,
) ([]dto.BookmarkItem, int64, int, int, error) {
	page := opts.Page
	if page == 0 {
		page = 1
	}
	if page < 1 {
		return nil, 0, 0, 0, apperrors.ErrInvalidPage
	}

	limit := opts.Limit
	if limit == 0 {
		limit = 20
	}
	if limit < 1 || limit > 100 {
		return nil, 0, 0, 0, apperrors.ErrInvalidLimit
	}

	if opts.MediaType != nil && !isValidBookmarkMediaType(*opts.MediaType) {
		return nil, 0, 0, 0, apperrors.ErrInvalidMediaType
	}

	bookmarks, total, err := s.bookmarkRepository.List(
		ctx,
		repository.BookmarkListFilter{
			UserID:    strings.TrimSpace(opts.UserID),
			MediaType: opts.MediaType,
			Skip:      int64(page-1) * int64(limit),
			Limit:     int64(limit),
		},
	)
	if err != nil {
		return nil, 0, 0, 0, err
	}

	totalPages := 0
	if total > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	var movieIDs, showIDs []string
	for _, b := range bookmarks {
		switch b.MediaType {
		case models.BookmarkMediaTypeMovie:
			movieIDs = append(movieIDs, b.MediaID)
		case models.BookmarkMediaTypeShow:
			showIDs = append(showIDs, b.MediaID)
		}
	}

	movieMap := make(map[string]models.Movie)
	if len(movieIDs) > 0 {
		movies, err := s.movieRepository.FindByIDsOrSlugs(ctx, movieIDs)
		if err != nil {
			return nil, 0, 0, 0, err
		}
		for _, m := range movies {
			movieMap[m.ID.Hex()] = m
			if m.IDs.Trakt > 0 {
				movieMap[strconv.Itoa(m.IDs.Trakt)] = m
			}
			if m.IDs.Slug != "" {
				movieMap[strings.ToLower(m.IDs.Slug)] = m
			}
		}
	}

	showMap := make(map[string]models.Show)
	if len(showIDs) > 0 {
		shows, err := s.showRepository.FindByIDsOrSlugs(ctx, showIDs)
		if err != nil {
			return nil, 0, 0, 0, err
		}
		for _, sh := range shows {
			showMap[sh.ID.Hex()] = sh
			if sh.IDs.Trakt > 0 {
				showMap[strconv.Itoa(sh.IDs.Trakt)] = sh
			}
			if sh.IDs.Slug != "" {
				showMap[strings.ToLower(sh.IDs.Slug)] = sh
			}
		}
	}

	items := make([]dto.BookmarkItem, 0, len(bookmarks))
	for _, b := range bookmarks {
		item := dto.ToBookmarkItem(b)
		lookupKey := strings.ToLower(strings.TrimSpace(b.MediaID))

		switch b.MediaType {
		case models.BookmarkMediaTypeMovie:
			if m, ok := movieMap[lookupKey]; ok {
				item.Title = m.Title
				item.Year = m.Year
				item.Rating = m.Rating
				item.Slug = m.IDs.Slug
				if m.Artwork.Poster != "" {
					item.Poster = m.Artwork.Poster
				} else if len(m.Artwork.Posters) > 0 {
					item.Poster = m.Artwork.Posters[0]
				}
			}
		case models.BookmarkMediaTypeShow:
			if sh, ok := showMap[lookupKey]; ok {
				item.Title = sh.Title
				item.Year = sh.Year
				item.Rating = sh.Rating
				item.Slug = sh.IDs.Slug
				if sh.Artwork.Poster != "" {
					item.Poster = sh.Artwork.Poster
				} else if len(sh.Artwork.Posters) > 0 {
					item.Poster = sh.Artwork.Posters[0]
				}
			}
		}

		items = append(items, item)
	}

	return items, total, page, totalPages, nil
}

func isValidBookmarkMediaType(t models.BookmarkMediaType) bool {
	return t == models.BookmarkMediaTypeMovie || t == models.BookmarkMediaTypeShow
}

func (s *BookmarkService) resolveCanonicalMediaID(
	ctx context.Context,
	mediaType models.BookmarkMediaType,
	rawMediaID string,
) (string, error) {
	val := strings.TrimSpace(rawMediaID)
	if val == "" {
		return "", apperrors.ErrInvalidBookmarkPayload
	}

	switch mediaType {
	case models.BookmarkMediaTypeMovie:
		movie, err := s.movieRepository.FindByIDOrSlug(ctx, val)
		if err != nil {
			return "", err
		}
		if slug := strings.ToLower(strings.TrimSpace(movie.IDs.Slug)); slug != "" {
			return slug, nil
		}
		if movie.IDs.Trakt > 0 {
			return strconv.Itoa(movie.IDs.Trakt), nil
		}
		return movie.ID.Hex(), nil

	case models.BookmarkMediaTypeShow:
		show, err := s.showRepository.FindByIDOrSlug(ctx, val)
		if err != nil {
			return "", err
		}
		if slug := strings.ToLower(strings.TrimSpace(show.IDs.Slug)); slug != "" {
			return slug, nil
		}
		if show.IDs.Trakt > 0 {
			return strconv.Itoa(show.IDs.Trakt), nil
		}
		return show.ID.Hex(), nil

	default:
		return "", apperrors.ErrInvalidMediaType
	}
}
