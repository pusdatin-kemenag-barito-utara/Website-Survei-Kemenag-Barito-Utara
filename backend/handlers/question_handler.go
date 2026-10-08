package handlers

import (
	"time"

	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/models"
	"survey-kemenag-backend/repository"
	"survey-kemenag-backend/service"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type QuestionHandler struct {
	repo repository.Repository
}

func NewQuestionHandler(repo repository.Repository) *QuestionHandler {
	return &QuestionHandler{repo: repo}
}

func (h *QuestionHandler) GetSurveyFormQuestions(c fiber.Ctx) error {
	cacheKey := "survey_form_questions"
	if cachedData, found := service.GetCache(cacheKey); found {
		if m, ok := cachedData.(fiber.Map); ok {
			if qList, ok := m["questions"].([]models.Question); ok && len(qList) > 0 {
				return c.JSON(cachedData)
			}
		}
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
	if len(questions) > 0 {
		service.SetCache(cacheKey, data, 10*time.Minute)
	}

	return c.JSON(data)
}

// Unsur CRUD
func (h *QuestionHandler) ListUnsur(c fiber.Ctx) error {
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

func (h *QuestionHandler) CreateUnsur(c fiber.Ctx) error {
	var item models.Unsur
	if err := c.Bind().Body(&item); err != nil {
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

func (h *QuestionHandler) UpdateUnsur(c fiber.Ctx) error {
	id, err := parseParamID(c)
	if err != nil {
		return err
	}
	var item models.Unsur
	if err := c.Bind().Body(&item); err != nil {
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

func (h *QuestionHandler) DeleteUnsur(c fiber.Ctx) error {
	id, err := parseParamID(c)
	if err != nil {
		return err
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
func (h *QuestionHandler) ListQuestions(c fiber.Ctx) error {
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

type QuestionInput struct {
	UnsurID        string            `json:"unsur_id"`
	ServiceID      *string           `json:"service_id"`
	QuestionTextID string            `json:"question_text_id"`
	QuestionTextEN string            `json:"question_text_en"`
	InputType      string            `json:"input_type"`
	RatingLabels   map[string]string `json:"rating_labels"`
	IsActive       bool              `json:"is_active"`
	SortOrder      int               `json:"sort_order"`
}

func (h *QuestionHandler) CreateQuestion(c fiber.Ctx) error {
	var input QuestionInput
	if err := c.Bind().Body(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	unsurUID := domain.PbIDToUUID(input.UnsurID)
	if unsurUID == uuid.Nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Unsur ID tidak valid"})
	}

	var sUID *uuid.UUID
	if input.ServiceID != nil && *input.ServiceID != "" {
		parsed := domain.PbIDToUUID(*input.ServiceID)
		if parsed != uuid.Nil {
			sUID = &parsed
		}
	}

	q := models.Question{
		UnsurID:        unsurUID,
		ServiceID:      sUID,
		QuestionTextID: input.QuestionTextID,
		QuestionTextEN: input.QuestionTextEN,
		InputType:      input.InputType,
		RatingLabels:   input.RatingLabels,
		IsActive:       input.IsActive,
		SortOrder:      input.SortOrder,
	}

	if err := h.repo.CreateQuestion(&q); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("admin_questions")
	return c.Status(fiber.StatusCreated).JSON(q)
}

func (h *QuestionHandler) UpdateQuestion(c fiber.Ctx) error {
	id, err := parseParamID(c)
	if err != nil {
		return err
	}

	var input QuestionInput
	if err := c.Bind().Body(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	unsurUID := domain.PbIDToUUID(input.UnsurID)
	var sUID *uuid.UUID
	if input.ServiceID != nil && *input.ServiceID != "" {
		parsed := domain.PbIDToUUID(*input.ServiceID)
		if parsed != uuid.Nil {
			sUID = &parsed
		}
	}

	q := models.Question{
		UnsurID:        unsurUID,
		ServiceID:      sUID,
		QuestionTextID: input.QuestionTextID,
		QuestionTextEN: input.QuestionTextEN,
		InputType:      input.InputType,
		RatingLabels:   input.RatingLabels,
		IsActive:       input.IsActive,
		SortOrder:      input.SortOrder,
	}

	updated, err := h.repo.UpdateQuestion(id, &q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("admin_questions")
	return c.JSON(updated)
}

func (h *QuestionHandler) DeleteQuestion(c fiber.Ctx) error {
	id, err := parseParamID(c)
	if err != nil {
		return err
	}
	if err := h.repo.DeleteQuestion(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_form_questions")
	service.DeleteCache("admin_questions")
	return c.JSON(fiber.Map{"message": "Pertanyaan berhasil dihapus"})
}
