package config

import (
	"log"
	"os"
	"strings"
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
}

func (c *Config) GetCorsOrigins() []string {
	if c.CorsOrigins == "" {
		return []string{}
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
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("❌ FATAL: DATABASE_URL environment variable is required (ensure Infisical injection is active)")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("❌ FATAL: JWT_SECRET environment variable is required (ensure Infisical injection is active)")
	}

	corsOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = os.Getenv("CORS_ORIGINS")
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
	}
}
