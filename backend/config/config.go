package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL        string
	DatabaseSchema     string
	JWTSecret          string
	CorsOrigins        string
	Port               string
	AdminEmail         string
	AdminPassword      string
	TurnstileSecretKey string
	PocketbaseURL      string
}

func (c *Config) GetCorsOrigins() []string {
	if c.CorsOrigins == "" {
		return []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	}
	parts := strings.Split(c.CorsOrigins, ",")
	var origins []string
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}

func LoadConfig() *Config {
	// Try loading from .env if present, otherwise proceed with system/Infisical env
	if err := godotenv.Load(); err != nil {
		_ = godotenv.Load("../.env")
	}

	pocketbaseURL := os.Getenv("POCKETBASE_URL")
	if pocketbaseURL == "" {
		pocketbaseURL = os.Getenv("PUBLIC_POCKETBASE_URL")
	}

	dbURL := os.Getenv("DATABASE_URL")

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "sikap-kemenag-secret-jwt-key-2026"
		log.Println("⚠️ JWT_SECRET not set in environment, using default key")
	}

	corsOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = os.Getenv("CORS_ORIGINS")
	}
	if corsOrigins == "" {
		corsOrigins = "http://localhost:3000, http://127.0.0.1:3000, https://survei.kemenag-baritoutara.com"
	}

	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = os.Getenv("SUPER_ADMIN_EMAIL")
	}
	if adminEmail == "" {
		adminEmail = os.Getenv("PUBLIC_SUPER_ADMIN_EMAIL")
	}

	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = os.Getenv("SUPER_ADMIN_PASSWORD")
	}

	port := os.Getenv("GO_PORT")
	if port == "" {
		port = os.Getenv("BACKEND_PORT")
	}
	if port == "" {
		p := os.Getenv("PORT")
		if p != "" && p != "3000" {
			port = p
		} else {
			port = "8080"
		}
	}
	if port == "" {
		port = "8080"
	}

	turnstileSecretKey := os.Getenv("TURNSTILE_SECRET_KEY")
	if turnstileSecretKey == "" {
		turnstileSecretKey = os.Getenv("CLOUDFLARE_TURNSTILE_SECRET_KEY")
	}

	dbSchema := os.Getenv("PUBLIC_PUSDATIN_SCHEMA")
	if dbSchema == "" {
		dbSchema = os.Getenv("DB_SCHEMA")
	}
	if dbSchema == "" {
		dbSchema = "kemenag_survey"
	}

	return &Config{
		DatabaseURL:        dbURL,
		DatabaseSchema:     dbSchema,
		JWTSecret:          jwtSecret,
		CorsOrigins:        corsOrigins,
		Port:               port,
		AdminEmail:         adminEmail,
		AdminPassword:      adminPassword,
		TurnstileSecretKey: turnstileSecretKey,
		PocketbaseURL:      pocketbaseURL,
	}
}

