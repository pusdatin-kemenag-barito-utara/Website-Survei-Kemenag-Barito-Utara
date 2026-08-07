package handlers

import (
	"survey-kemenag-backend/models"
	"survey-kemenag-backend/repository"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type DemographicHandler struct {
	repo repository.Repository
}

func NewDemographicHandler(repo repository.Repository) *DemographicHandler {
	return &DemographicHandler{repo: repo}
}

func (h *DemographicHandler) ListFieldsAdmin(c *fiber.Ctx) error {
	fields, err := h.repo.ListAllDemographicFieldsAdmin()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fields)
}

func (h *DemographicHandler) CreateField(c *fiber.Ctx) error {
	var field models.DemographicField
	if err := c.BodyParser(&field); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	if err := h.repo.CreateDemographicField(&field); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(field)
}

func (h *DemographicHandler) UpdateField(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	var field models.DemographicField
	if err := c.BodyParser(&field); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	updated, err := h.repo.UpdateDemographicField(id, &field)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(updated)
}

func (h *DemographicHandler) DeleteField(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	if err := h.repo.DeleteDemographicField(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Field demografi berhasil dihapus"})
}

func (h *DemographicHandler) ListOptions(c *fiber.Ctx) error {
	fieldIDStr := c.Params("fieldId")
	fieldID, err := uuid.Parse(fieldIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Field ID tidak valid"})
	}

	options, err := h.repo.ListDemographicOptionsByField(fieldID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(options)
}

func (h *DemographicHandler) CreateOption(c *fiber.Ctx) error {
	var opt models.DemographicOption
	if err := c.BodyParser(&opt); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	if err := h.repo.CreateDemographicOption(&opt); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(opt)
}

func (h *DemographicHandler) UpdateOption(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	var opt models.DemographicOption
	if err := c.BodyParser(&opt); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	updated, err := h.repo.UpdateDemographicOption(id, &opt)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(updated)
}

func (h *DemographicHandler) DeleteOption(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	if err := h.repo.DeleteDemographicOption(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Opsi demografi berhasil dihapus"})
}
