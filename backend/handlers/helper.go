package handlers

import (
	"strings"
	"survey-kemenag-backend/domain"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

// parseParamID flexibly parses an ID parameter from the URL.
// It supports standard 36-char UUIDs, as well as 15-char PocketBase record IDs.
func parseParamID(c fiber.Ctx, paramName ...string) (uuid.UUID, error) {
	name := "id"
	if len(paramName) > 0 {
		name = paramName[0]
	}
	idStr := strings.TrimSpace(c.Params(name))
	if idStr == "" {
		return uuid.Nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak boleh kosong"})
	}

	u := domain.PbIDToUUID(idStr)
	if u == uuid.Nil {
		return uuid.Nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}
	return u, nil
}
