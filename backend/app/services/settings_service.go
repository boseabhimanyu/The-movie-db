package services

import (
	"context"
	"errors"
	"strings"

	"movie-app/config"
	"movie-app/models"
	"movie-app/repository"
)

type SettingsService struct {
	settingsRepository repository.ApplicationSettingsRepository
	config             config.Config
}

func NewSettingsService(
	settingsRepository repository.ApplicationSettingsRepository,
	cfg config.Config,
) *SettingsService {
	return &SettingsService{
		settingsRepository: settingsRepository,
		config:             cfg,
	}
}

func (s *SettingsService) GetSettings(
	ctx context.Context,
) (*models.ApplicationSettings, error) {
	return s.settingsRepository.Get(ctx)
}

func (s *SettingsService) IsRegistrationEnabled(
	ctx context.Context,
) (bool, error) {
	settings, err := s.settingsRepository.Get(ctx)
	if err != nil {
		return false, err
	}

	return settings.RegistrationEnabled, nil
}

func (s *SettingsService) UpdateRegistrationEnabled(
	ctx context.Context,
	enabled bool,
	updatedBy string,
) error {
	return s.settingsRepository.UpdateRegistrationEnabled(
		ctx,
		enabled,
		updatedBy,
	)
}

func (s *SettingsService) IsTwoFactorEnabled(
	ctx context.Context,
) (bool, error) {
	settings, err := s.settingsRepository.Get(ctx)
	if err != nil {
		return false, err
	}

	return settings.TwoFactorEnabled, nil
}

func (s *SettingsService) UpdateTwoFactorEnabled(
	ctx context.Context,
	enabled bool,
	updatedBy string,
) error {
	if enabled {
		if err := s.validateTwoFactorConfig(); err != nil {
			return err
		}
	}

	return s.settingsRepository.UpdateTwoFactorEnabled(
		ctx,
		enabled,
		updatedBy,
	)
}

func (s *SettingsService) ValidateTwoFactorStartupConfig(
	ctx context.Context,
) error {
	enabled, err := s.IsTwoFactorEnabled(ctx)
	if err != nil {
		return err
	}

	if !enabled {
		return nil
	}

	return s.validateTwoFactorConfig()
}

func (s *SettingsService) UpdateLoginIdentifiers(
	ctx context.Context,
	primaryEmail bool,
	username bool,
	phone bool,
	updatedBy string,
) error {
	if !primaryEmail &&
		!username &&
		!phone {
		return errors.New(
			"At least one login identifier must be enabled",
		)
	}

	return s.settingsRepository.UpdateLoginIdentifiers(
		ctx,
		primaryEmail,
		username,
		phone,
		updatedBy,
	)
}

func (s *SettingsService) GetLoginHint(
	ctx context.Context,
) (string, error) {
	settings, err := s.settingsRepository.Get(ctx)
	if err != nil {
		return "", err
	}

	var identifiers []string

	if settings.LoginWithPrimaryEmail {
		identifiers = append(identifiers, "email")
	}

	if settings.LoginWithUsername {
		identifiers = append(identifiers, "username")
	}

	if settings.LoginWithPhone {
		identifiers = append(identifiers, "phone number")
	}

	switch len(identifiers) {
	case 1:
		return "Enter " + identifiers[0], nil

	case 2:
		return "Enter " +
			identifiers[0] +
			" or " +
			identifiers[1], nil

	case 3:
		return "Enter " +
			identifiers[0] +
			", " +
			identifiers[1] +
			" or " +
			identifiers[2], nil

	case 4:
		return "Enter " +
			strings.Join(identifiers[:3], ", ") +
			" or " +
			identifiers[3], nil

	default:
		return "Enter login identifier", nil
	}
}

func (s *SettingsService) GetMenuMaxDepth(
	ctx context.Context,
) (models.MenuMaxDepthSettings, error) {
	settings, err := s.settingsRepository.Get(ctx)
	if err != nil {
		return models.MenuMaxDepthSettings{}, err
	}

	return settings.MenuMaxDepth, nil
}

func (s *SettingsService) UpdateMenuMaxDepth(
	ctx context.Context,
	top int,
	left int,
	bottom int,
	updatedBy string,
) error {
	if top < 1 || left < 1 || bottom < 1 {
		return errors.New(
			"menu max depth must be at least 1 for every location",
		)
	}

	return s.settingsRepository.UpdateMenuMaxDepth(
		ctx,
		top,
		left,
		bottom,
		updatedBy,
	)
}

func (s *SettingsService) validateTwoFactorConfig() error {
	if err := s.config.ValidateTOTPEncryptionKey(); err != nil {
		return err
	}

	if err := s.config.ValidateBackupCodeConfig(); err != nil {
		return err
	}

	return nil
}

func (s *SettingsService) GetUnverifiedMaxReviews(
	ctx context.Context,
) (int, error) {
	settings, err := s.settingsRepository.Get(ctx)
	if err != nil {
		return 0, err
	}

	return settings.UnverifiedMaxReviews, nil
}

func (s *SettingsService) UpdateUnverifiedMaxReviews(
	ctx context.Context,
	maxReviews int,
	updatedBy string,
) error {
	if maxReviews < 0 {
		return errors.New("unverified max reviews cannot be negative")
	}

	return s.settingsRepository.UpdateUnverifiedMaxReviews(
		ctx,
		maxReviews,
		updatedBy,
	)
}
