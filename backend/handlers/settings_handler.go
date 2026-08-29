package handlers

import (
	"survey-kemenag-backend/config"
	"survey-kemenag-backend/repository"

	"github.com/gofiber/fiber/v3"
)

type SettingsHandler struct {
	Config *config.Config
	Repo   repository.Repository
}

func NewSettingsHandler(cfg *config.Config, repo repository.Repository) *SettingsHandler {
	return &SettingsHandler{Config: cfg, Repo: repo}
}

func (h *SettingsHandler) GetSettings(c fiber.Ctx) error {
	settings, err := h.Repo.GetAppSettingsMap()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch settings",
		})
	}
	return c.JSON(settings)
}

func (h *SettingsHandler) UpdateSettings(c fiber.Ctx) error {
	var body map[string]string
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request payload",
		})
	}

	if err := h.Repo.UpdateAppSettings(body); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update settings",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Settings updated successfully",
	})
}
