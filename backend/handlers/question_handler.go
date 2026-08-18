package handlers

import (
	"time"

	"survey-kemenag-backend/models"
	"survey-kemenag-backend/repository"
	"survey-kemenag-backend/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type QuestionHandler struct {
	repo repository.Repository
}

func NewQuestionHandler(repo repository.Repository) *QuestionHandler {
	return &QuestionHandler{repo: repo}
}

func (h *QuestionHandler) GetSurveyFormQuestions(c *fiber.Ctx) error {
	cacheKey := "survey_form_questions"
	if cachedData, found := service.GetCache(cacheKey); found {
		return c.JSON(cachedData)
	}

	questions, err := h.repo.ListActiveQuestions()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	demoFields, err := h.repo.ListActiveDemographicFields()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	data := fiber.Map{
		"questions":          questions,
		"demographic_fields": demoFields,
	}
	service.SetCache(cacheKey, data, 10*time.Minute)

	return c.JSON(data)
}

// Unsur CRUD
func (h *QuestionHandler) ListUnsur(c *fiber.Ctx) error {
	cacheKey := "admin_unsur"
	if cachedData, found := service.GetCache(cacheKey); found {
		return c.JSON(cachedData)
	}

	list, err := h.repo.ListUnsur()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.SetCache(cacheKey, list, 5*time.Minute)
	return c.JSON(list)
}

func (h *QuestionHandler) CreateUnsur(c *fiber.Ctx) error {
	var item models.Unsur
	if err := c.BodyParser(&item); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}
	if err := h.repo.CreateUnsur(&item); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("public_results")
	service.DeleteCache("admin_unsur")
	service.DeleteCache("admin_stats")
	return c.Status(fiber.StatusCreated).JSON(item)
}

func (h *QuestionHandler) UpdateUnsur(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}
	var item models.Unsur
	if err := c.BodyParser(&item); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	updated, err := h.repo.UpdateUnsur(id, &item)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("public_results")
	service.DeleteCache("admin_unsur")
	service.DeleteCache("admin_stats")
	return c.JSON(updated)
}

func (h *QuestionHandler) DeleteUnsur(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}
	if err := h.repo.DeleteUnsur(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("public_results")
	service.DeleteCache("admin_unsur")
	service.DeleteCache("admin_stats")
	return c.JSON(fiber.Map{"message": "Unsur berhasil dihapus"})
}

// Question CRUD
func (h *QuestionHandler) ListQuestions(c *fiber.Ctx) error {
	cacheKey := "admin_questions"
	if cachedData, found := service.GetCache(cacheKey); found {
		return c.JSON(cachedData)
	}

	list, err := h.repo.ListAllQuestions()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.SetCache(cacheKey, list, 5*time.Minute)
	return c.JSON(list)
}

func (h *QuestionHandler) CreateQuestion(c *fiber.Ctx) error {
	var q models.Question
	if err := c.BodyParser(&q); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}
	if err := h.repo.CreateQuestion(&q); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("admin_questions")
	return c.Status(fiber.StatusCreated).JSON(q)
}

func (h *QuestionHandler) UpdateQuestion(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	var q models.Question
	if err := c.BodyParser(&q); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	updated, err := h.repo.UpdateQuestion(id, &q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("admin_questions")
	return c.JSON(updated)
}

func (h *QuestionHandler) DeleteQuestion(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}
	if err := h.repo.DeleteQuestion(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("admin_questions")
	return c.JSON(fiber.Map{"message": "Pertanyaan berhasil dihapus"})
}
