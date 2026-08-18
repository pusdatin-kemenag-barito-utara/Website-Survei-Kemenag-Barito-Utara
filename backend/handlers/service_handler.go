package handlers

import (
	"time"

	"survey-kemenag-backend/models"
	"survey-kemenag-backend/repository"
	"survey-kemenag-backend/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ServiceHandler struct {
	repo repository.Repository
}

func NewServiceHandler(repo repository.Repository) *ServiceHandler {
	return &ServiceHandler{repo: repo}
}

func (h *ServiceHandler) GetServices(c *fiber.Ctx) error {
	cacheKey := "survey_services"
	if cachedData, found := service.GetCache(cacheKey); found {
		return c.JSON(cachedData)
	}

	services, err := h.repo.ListActiveServices()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	categories, err := h.repo.ListServiceCategories()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	data := fiber.Map{
		"services":   services,
		"categories": categories,
	}
	service.SetCache(cacheKey, data, 10*time.Minute)

	return c.JSON(data)
}

func (h *ServiceHandler) ListServicesAdmin(c *fiber.Ctx) error {
	cacheKey := "admin_services"
	if cachedData, found := service.GetCache(cacheKey); found {
		return c.JSON(cachedData)
	}

	services, err := h.repo.ListAllServicesAdmin()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.SetCache(cacheKey, services, 5*time.Minute)
	return c.JSON(services)
}

func (h *ServiceHandler) CreateService(c *fiber.Ctx) error {
	var s models.Service
	if err := c.BodyParser(&s); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	if err := h.repo.CreateService(&s); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_services")
	service.DeleteCache("admin_services")
	service.DeleteCache("admin_stats")
	return c.Status(fiber.StatusCreated).JSON(s)
}

func (h *ServiceHandler) UpdateService(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	var s models.Service
	if err := c.BodyParser(&s); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	updated, err := h.repo.UpdateService(id, &s)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_services")
	service.DeleteCache("admin_services")
	service.DeleteCache("admin_stats")
	return c.JSON(updated)
}

func (h *ServiceHandler) DeleteService(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	if err := h.repo.DeleteService(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	service.DeleteCache("survey_services")
	service.DeleteCache("admin_services")
	service.DeleteCache("admin_stats")
	return c.JSON(fiber.Map{"message": "Layanan berhasil dihapus"})
}
