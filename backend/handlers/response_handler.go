package handlers

import (
	"strconv"
	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/repository"
	"survey-kemenag-backend/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ResponseHandler struct {
	repo          repository.Repository
	surveyService *service.SurveyService
}

func NewResponseHandler(repo repository.Repository, surveyService *service.SurveyService) *ResponseHandler {
	return &ResponseHandler{
		repo:          repo,
		surveyService: surveyService,
	}
}

func (h *ResponseHandler) SubmitSurvey(c *fiber.Ctx) error {
	var req domain.SubmitSurveyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload request tidak valid"})
	}

	respID, err := h.surveyService.SubmitSurvey(&req, c.IP())
	if err != nil {
		if fiberErr, ok := err.(*fiber.Error); ok {
			return c.Status(fiberErr.Code).JSON(fiber.Map{"error": fiberErr.Message})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":     "Survei berhasil dikirim, terima kasih atas partisipasi Anda!",
		"response_id": respID,
	})
}

func (h *ResponseHandler) ListResponsesAdmin(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	offset := (page - 1) * limit

	serviceID := c.Query("service_id")
	periodID := c.Query("period_id")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	search := c.Query("search")

	responses, total, err := h.repo.ListResponsesPaginated(serviceID, periodID, dateFrom, dateTo, search, limit, offset)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":  responses,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *ResponseHandler) DeleteResponseAdmin(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID respon tidak valid"})
	}

	if err := h.repo.DeleteResponseFull(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menghapus data respon"})
	}

	return c.JSON(fiber.Map{
		"message": "Data respon survei berhasil dihapus",
	})
}

func (h *ResponseHandler) GetResponseAnswersAdmin(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID respon tidak valid"})
	}

	results, err := h.repo.GetResponseAnswersDetail(id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var formattedResults []fiber.Map
	for _, r := range results {
		formattedResults = append(formattedResults, fiber.Map{
			"id":           r.ID,
			"rating_value": r.RatingValue,
			"questions": fiber.Map{
				"question_text_id": r.QuestionTextID,
				"question_text_en": r.QuestionTextEN,
			},
			"unsur": fiber.Map{
				"name":       r.UnsurName,
				"index_type": r.IndexType,
			},
		})
	}

	return c.JSON(formattedResults)
}

func (h *ResponseHandler) GetResponseDemographicsAdmin(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID respon tidak valid"})
	}

	results, err := h.repo.GetResponseDemographicsDetail(id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var formattedResults []fiber.Map
	for _, r := range results {
		formattedResults = append(formattedResults, fiber.Map{
			"id":    r.ID,
			"value": r.Value,
			"demographic_fields": fiber.Map{
				"label_id":  r.LabelID,
				"label_en":  r.LabelEN,
				"field_key": r.FieldKey,
			},
		})
	}

	return c.JSON(formattedResults)
}
