package handlers

import (
	"survey-kemenag-backend/repository"

	"github.com/gofiber/fiber/v2"
)

type SettingHandler struct {
	repo repository.Repository
}

func NewSettingHandler(repo repository.Repository) *SettingHandler {
	return &SettingHandler{repo: repo}
}

func (h *SettingHandler) GetAppSettings(c *fiber.Ctx) error {
	result, err := h.repo.GetAppSettingsMap()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(result)
}

func (h *SettingHandler) UpdateAppSetting(c *fiber.Ctx) error {
	var body map[string]string
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	if err := h.repo.UpdateAppSettings(body); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Pengaturan berhasil diperbarui"})
}
