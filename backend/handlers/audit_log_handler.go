package handlers

import (
	"strconv"
	"survey-kemenag-backend/models"
	"survey-kemenag-backend/repository"

	"github.com/gofiber/fiber/v2"
)

type AuditLogHandler struct {
	repo repository.Repository
}

func NewAuditLogHandler(repo repository.Repository) *AuditLogHandler {
	return &AuditLogHandler{repo: repo}
}

// List godoc - GET /admin/audit-logs?limit=50&page=1
func (h *AuditLogHandler) List(c *fiber.Ctx) error {
	limit := 50
	page := 1
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}
	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	offset := (page - 1) * limit

	logs, total, err := h.repo.ListAuditLogs(limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"data":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// Helper used by other handlers to write audit entries
func WriteAudit(repo repository.Repository, userEmail, action, entityName, entityID, details string) {
	_ = repo.WriteAuditLog(&models.AuditLog{
		UserEmail:  userEmail,
		Action:     action,
		EntityName: entityName,
		EntityID:   entityID,
		Details:    details,
	})
}
