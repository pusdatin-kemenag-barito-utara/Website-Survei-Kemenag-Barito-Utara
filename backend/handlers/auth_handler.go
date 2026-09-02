package handlers

import (
	"strings"
	"time"

	"survey-kemenag-backend/config"
	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/models"
	"survey-kemenag-backend/repository"
	"survey-kemenag-backend/service"

	"github.com/gofiber/fiber/v3"
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

// GetRealClientIP extracts client IP prioritizing CF-Connecting-IP and X-Forwarded-For
func GetRealClientIP(c fiber.Ctx) string {
	if cfIP := c.Get("CF-Connecting-IP"); cfIP != "" {
		return strings.TrimSpace(cfIP)
	}
	if xRealIP := c.Get("X-Real-IP"); xRealIP != "" {
		return strings.TrimSpace(xRealIP)
	}
	if xff := c.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 && strings.TrimSpace(parts[0]) != "" {
			return strings.TrimSpace(parts[0])
		}
	}
	return c.IP()
}

func (h *AuthHandler) Login(c fiber.Ctx) error {
	var req domain.LoginRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request payload",
		})
	}

	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email dan kata sandi wajib diisi",
		})
	}

	// Server-Side Cloudflare Turnstile Verification (if secret key is set)
	if h.Config.TurnstileSecretKey != "" && req.TurnstileToken != "" {
		clientIP := GetRealClientIP(c)
		if !service.VerifyTurnstileToken(h.Config.TurnstileSecretKey, req.TurnstileToken, clientIP) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Verifikasi keamanan Cloudflare Turnstile gagal. Silakan coba lagi.",
			})
		}
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
			"error": "Email atau kata sandi tidak sesuai",
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

func (h *AuthHandler) Me(c fiber.Ctx) error {
	email := c.Locals("email")
	role := c.Locals("role")

	return c.JSON(fiber.Map{
		"email": email,
		"role":  role,
	})
}

// ChangePassword handles secure password change for authenticated administrators
func (h *AuthHandler) ChangePassword(c fiber.Ctx) error {
	email, ok := c.Locals("email").(string)
	if !ok || email == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Autentikasi diperlukan",
		})
	}

	var req domain.ChangePasswordRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Payload data tidak valid",
		})
	}

	if req.OldPassword == "" || req.NewPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Kata sandi lama dan kata sandi baru wajib diisi",
		})
	}

	if len(req.NewPassword) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Kata sandi baru minimal 6 karakter",
		})
	}

	// Verify old password against database or env
	authUser, err := h.Repo.GetAuthUserByEmail(email)
	validOld := false
	if err == nil && authUser != nil && authUser.EncryptedPassword != "" {
		if bcrypt.CompareHashAndPassword([]byte(authUser.EncryptedPassword), []byte(req.OldPassword)) == nil {
			validOld = true
		}
	} else if h.Config.AdminEmail == email && h.Config.AdminPassword == req.OldPassword {
		validOld = true
	}

	if !validOld {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Kata sandi lama tidak sesuai",
		})
	}

	// Generate bcrypt hash for new password
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengenkripsi kata sandi baru",
		})
	}

	// Update in database
	if err := h.Repo.UpdateAuthUserPassword(email, string(hashedBytes)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal memperbarui kata sandi di database",
		})
	}

	// Log audit trail
	go func() {
		_ = h.Repo.WriteAuditLog(&models.AuditLog{
			UserEmail:  email,
			Action:     "CHANGE_PASSWORD",
			EntityName: "User",
			EntityID:   email,
			Details:    `{"status":"success"}`,
		})
	}()

	return c.JSON(fiber.Map{
		"message": "Kata sandi berhasil diperbarui",
	})
}
