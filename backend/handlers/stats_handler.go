package handlers

import (
	"survey-kemenag-backend/service"

	"github.com/gofiber/fiber/v2"
)

type StatsHandler struct {
	surveyService *service.SurveyService
}

func NewStatsHandler(surveyService *service.SurveyService) *StatsHandler {
	return &StatsHandler{surveyService: surveyService}
}

func (h *StatsHandler) GetPublicResults(c *fiber.Ctx) error {
	results, err := h.surveyService.GetPublicResults()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(results)
}

func (h *StatsHandler) GetAdminStats(c *fiber.Ctx) error {
	stats, err := h.surveyService.GetAdminStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stats)
}

func (h *StatsHandler) GetArchiveResults(c *fiber.Ctx) error {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	results, err := h.surveyService.GetArchiveResults(startDate, endDate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(results)
}

