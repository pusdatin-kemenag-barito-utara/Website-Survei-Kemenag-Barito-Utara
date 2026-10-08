package handlers

import (
	"time"

	"survey-kemenag-backend/models"
	"survey-kemenag-backend/repository"
	"survey-kemenag-backend/service"

	"github.com/gofiber/fiber/v3"
)

type DemographicHandler struct {
	repo repository.Repository
}

func NewDemographicHandler(repo repository.Repository) *DemographicHandler {
	return &DemographicHandler{repo: repo}
}

func (h *DemographicHandler) ListFieldsAdmin(c fiber.Ctx) error {
	cacheKey := "admin_demographics"
	if cachedData, found := service.GetCache(cacheKey); found {
		return c.JSON(cachedData)
	}

	fields, err := h.repo.ListAllDemographicFieldsAdmin()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.SetCache(cacheKey, fields, 5*time.Minute)
	return c.JSON(fields)
}

func (h *DemographicHandler) CreateField(c fiber.Ctx) error {
	var field models.DemographicField
	if err := c.Bind().Body(&field); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	if err := h.repo.CreateDemographicField(&field); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("admin_demographics")
	return c.Status(fiber.StatusCreated).JSON(field)
}

func (h *DemographicHandler) UpdateField(c fiber.Ctx) error {
	id, err := parseParamID(c)
	if err != nil {
		return err
	}

	var field models.DemographicField
	if err := c.Bind().Body(&field); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	updated, err := h.repo.UpdateDemographicField(id, &field)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("admin_demographics")
	return c.JSON(updated)
}

func (h *DemographicHandler) DeleteField(c fiber.Ctx) error {
	id, err := parseParamID(c)
	if err != nil {
		return err
	}

	if err := h.repo.DeleteDemographicField(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("admin_demographics")
	return c.JSON(fiber.Map{"message": "Field demografi berhasil dihapus"})
}

func (h *DemographicHandler) ListOptions(c fiber.Ctx) error {
	fieldID, err := parseParamID(c, "fieldId")
	if err != nil {
		return err
	}

	options, err := h.repo.ListDemographicOptionsByField(fieldID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(options)
}

func (h *DemographicHandler) CreateOption(c fiber.Ctx) error {
	var opt models.DemographicOption
	if err := c.Bind().Body(&opt); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	if err := h.repo.CreateDemographicOption(&opt); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("admin_demographics")
	return c.Status(fiber.StatusCreated).JSON(opt)
}

func (h *DemographicHandler) UpdateOption(c fiber.Ctx) error {
	id, err := parseParamID(c)
	if err != nil {
		return err
	}

	var opt models.DemographicOption
	if err := c.Bind().Body(&opt); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	updated, err := h.repo.UpdateDemographicOption(id, &opt)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("admin_demographics")
	return c.JSON(updated)
}

func (h *DemographicHandler) DeleteOption(c fiber.Ctx) error {
	id, err := parseParamID(c)
	if err != nil {
		return err
	}

	if err := h.repo.DeleteDemographicOption(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("admin_demographics")
	return c.JSON(fiber.Map{"message": "Opsi demografi berhasil dihapus"})
}
