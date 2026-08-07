package handlers

import (
	"survey-kemenag-backend/models"
	"survey-kemenag-backend/repository"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type PeriodHandler struct {
	repo repository.Repository
}

func NewPeriodHandler(repo repository.Repository) *PeriodHandler {
	return &PeriodHandler{repo: repo}
}

func (h *PeriodHandler) GetActivePeriod(c *fiber.Ctx) error {
	period, err := h.repo.GetActivePeriod()
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Tidak ada periode survei yang sedang aktif",
		})
	}
	return c.JSON(period)
}

func (h *PeriodHandler) ListPeriods(c *fiber.Ctx) error {
	periods, err := h.repo.ListPeriods()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(periods)
}

func (h *PeriodHandler) CreatePeriod(c *fiber.Ctx) error {
	var period models.SurveyPeriod
	if err := c.BodyParser(&period); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	if err := h.repo.CreatePeriod(&period); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(period)
}

func (h *PeriodHandler) SetPeriodActive(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID periode tidak valid"})
	}

	if err := h.repo.SetPeriodActive(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Periode survei berhasil diaktifkan"})
}

func (h *PeriodHandler) UpdatePeriod(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID periode tidak valid"})
	}

	var period models.SurveyPeriod
	if err := c.BodyParser(&period); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	updated, err := h.repo.UpdatePeriod(id, &period)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(updated)
}

func (h *PeriodHandler) DeletePeriod(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID periode tidak valid"})
	}

	if err := h.repo.DeletePeriod(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Periode survei berhasil dihapus"})
}

