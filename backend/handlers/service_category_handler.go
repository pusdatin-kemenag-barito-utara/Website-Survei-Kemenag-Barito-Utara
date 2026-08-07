package handlers

import (
	"survey-kemenag-backend/models"
	"survey-kemenag-backend/repository"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ServiceCategoryHandler struct {
	repo repository.Repository
}

func NewServiceCategoryHandler(repo repository.Repository) *ServiceCategoryHandler {
	return &ServiceCategoryHandler{repo: repo}
}

// List godoc - GET /admin/service-categories
func (h *ServiceCategoryHandler) List(c *fiber.Ctx) error {
	cats, err := h.repo.ListServiceCategories()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(cats)
}

// Create godoc - POST /admin/service-categories
func (h *ServiceCategoryHandler) Create(c *fiber.Ctx) error {
	var body models.ServiceCategory
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if body.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name is required"})
	}
	if err := h.repo.CreateServiceCategory(&body); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(body)
}

// Update godoc - PUT /admin/service-categories/:id
func (h *ServiceCategoryHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}
	var body models.ServiceCategory
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	updated, err := h.repo.UpdateServiceCategory(id, &body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(updated)
}

// Delete godoc - DELETE /admin/service-categories/:id
func (h *ServiceCategoryHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}
	if err := h.repo.DeleteServiceCategory(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
