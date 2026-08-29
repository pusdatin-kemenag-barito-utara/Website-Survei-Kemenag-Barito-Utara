package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL   string
	JWTSecret     string
	CorsOrigins   string
	Port          string
	AdminEmail    string
	AdminPassword string
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
	// Try loading from local .env or parent root ../.env
	err := godotenv.Load()
	if err != nil {
		err = godotenv.Load("../.env")
		if err != nil {
			log.Println("⚠️ .env file not found in local or root directory, using OS env")
		}
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable"
	}

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

	return &Config{
		DatabaseURL:   dbURL,
		JWTSecret:     jwtSecret,
		CorsOrigins:   corsOrigins,
		Port:          port,
		AdminEmail:    adminEmail,
		AdminPassword: adminPassword,
	}
}

