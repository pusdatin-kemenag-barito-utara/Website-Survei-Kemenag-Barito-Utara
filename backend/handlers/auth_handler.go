package handlers

import (
	"time"

	"survey-kemenag-backend/config"
	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/repository"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	Config *config.Config
	Repo   repository.Repository
}

func NewAuthHandler(cfg *config.Config, repo repository.Repository) *AuthHandler {
	return &AuthHandler{Config: cfg, Repo: repo}
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req domain.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request payload",
		})
	}

	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email and password are required",
		})
	}

	authenticated := false
	userID := "admin-id"

	// 1. First, check database Supabase auth.users table
	authUser, err := h.Repo.GetAuthUserByEmail(req.Email)
	if err == nil && authUser != nil && authUser.EncryptedPassword != "" {
		if bcrypt.CompareHashAndPassword([]byte(authUser.EncryptedPassword), []byte(req.Password)) == nil {
			authenticated = true
			userID = authUser.ID
		}
	}

	// 2. Fallback: check environment configuration
	if !authenticated {
		if h.Config.AdminEmail != "" && h.Config.AdminPassword != "" {
			if req.Email == h.Config.AdminEmail && req.Password == h.Config.AdminPassword {
				authenticated = true
			}
		}
	}

	if !authenticated {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Email atau password salah",
		})
	}

	// Create JWT Claims
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": req.Email,
		"role":  "authenticated",
		"exp":   time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days token
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	t, err := token.SignedString([]byte(h.Config.JWTSecret))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not generate authentication token",
		})
	}

	return c.JSON(fiber.Map{
		"access_token": t,
		"token_type":   "Bearer",
		"expires_in":   604800,
		"user": fiber.Map{
			"email": req.Email,
			"role":  "authenticated",
		},
	})
}


func (h *AuthHandler) Me(c *fiber.Ctx) error {
	email := c.Locals("email")
	role := c.Locals("role")

	return c.JSON(fiber.Map{
		"email": email,
		"role":  role,
	})
}
