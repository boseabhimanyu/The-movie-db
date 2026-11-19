package apperrors

import (
	"errors"
)

var (
	ErrEmailAlreadyExists    = errors.New("email already exists")
	ErrUsernameAlreadyExists = errors.New("username already exists")
	ErrPhoneAlreadyExists    = errors.New("phone number already exists")

	// Validation errors
	ErrInvalidUserID       = errors.New("invalid user id")
	ErrInvalidPassword     = errors.New("invalid password")
	ErrInvalidUserRole     = errors.New("invalid user role")
	ErrInvalidCredentials  = errors.New("invalid credentials")
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
	ErrNoFieldsToUpdate    = errors.New("no fields to update")
	ErrInvalidBio          = errors.New("invalid bio")
	ErrInvalidCountry      = errors.New("invalid country")

	// Pagination
	ErrInvalidPage  = errors.New("page must be greater than zero")
	ErrInvalidLimit = errors.New("limit must be between 1 and 100")

	// User
	ErrCannotChangeOwnStatus       = errors.New("admin cannot change their own account status")
	ErrUserNotFound                = errors.New("user not found")
	ErrRegistrationDisabled        = errors.New("user registration is currently disabled by the administrator")
	ErrApplicationSettingsNotFound = errors.New("application settings not found")

	// RefreshToken
	ErrRefreshTokenNotFound = errors.New("refresh token not found")

	// Menu
	ErrMenuNotFound          = errors.New("menu not found")
	ErrMenuInactive          = errors.New("menu inactive")
	ErrMenuAlreadyExists     = errors.New("menu already exists")
	ErrInvalidMenuLocation   = errors.New("invalid menu location")
	ErrInvalidMenuName       = errors.New("invalid menu name")
	ErrInvalidMenuItem       = errors.New("invalid menu item")
	ErrMenuDepthExceeded     = errors.New("menu nesting depth exceeded")
	ErrMenuItemNotFound      = errors.New("menu item not found")
	ErrMenuItemOrderNotFound = errors.New("menu item order not found")

	// Pages
	ErrPageNotFound               = errors.New("page not found")
	ErrInvalidPageContent         = errors.New("invalid page")
	ErrInvalidVisibility          = errors.New("invalid page visibility")
	ErrInvalidSlug                = errors.New("invalid slug")
	ErrSlugAlreadyExists          = errors.New("slug already exists")
	ErrHomepageRequiresPublicPage = errors.New("only public pages can be set as homepage")
	ErrHomepageCannotBeDeleted    = errors.New("homepage cannot be deleted")
	ErrHomepageMustBePublic       = errors.New("homepage visibility must remain public")
	ErrInvalidCSS                 = errors.New("invalid or unsafe CSS")

	// TOTP/2FA
	ErrInvalidTOTPCode          = errors.New("invalid TOTP code")
	ErrTwoFactorSetupNotStarted = errors.New("two-factor setup has not been started")
	ErrTwoFactorNotEnabled      = errors.New("two-factor authentication is not enabled")
	ErrTwoFactorAlreadyEnabled  = errors.New("two-factor authentication is already enabled")
	ErrInvalidBackupCode        = errors.New("invalid backup code")
	ErrTwoFactorResetNotAllowed = errors.New("two-factor reset is not allowed for this user")

	// Movies & TV Shows
	ErrInvalidBatchSync = errors.New("invalid batch sync request")
	ErrMediaNotFound    = errors.New("media not found")

	// Reviews and ratings
	ErrInvalidReviewInput  = errors.New("invalid review input")
	ErrReviewAlreadyExists = errors.New("user has already reviewed this media")
	ErrReviewNotFound      = errors.New("review not found")
	ErrReviewForbidden     = errors.New("not authorized to modify this review")
	ErrSelfHelpfulVote     = errors.New("cannot mark your own review as helpful")
)
