package config

import (
	"log"
	"os"
	"strings"
)

type Config struct {
	DatabaseURL             string
	DatabaseSchema          string
	PocketBaseURL           string
	PocketBaseAdminEmail    string
	PocketBaseAdminPassword string
	JWTSecret               string
	CorsOrigins             string
	Port                    string
	AdminEmail              string
	AdminPassword           string
	TurnstileSecretKey      string
}

func (c *Config) GetCorsOrigins() []string {
	origins := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"https://survei.kemenag-baritoutara.com",
	}
	if c.CorsOrigins != "" {
		parts := strings.Split(c.CorsOrigins, ",")
		for _, p := range parts {
			trimmed := strings.TrimSpace(p)
			if trimmed != "" && trimmed != "*" {
				found := false
				for _, o := range origins {
					if o == trimmed {
						found = true
						break
					}
				}
				if !found {
					origins = append(origins, trimmed)
				}
			}
		}
	}
	return origins
}

func LoadConfig() *Config {
	pbURL := os.Getenv("POCKETBASE_URL")
	if pbURL == "" {
		pbURL = os.Getenv("PUBLIC_POCKETBASE_URL")
	}

	pbEmail := os.Getenv("POCKETBASE_ADMIN_EMAIL")
	pbPassword := os.Getenv("POCKETBASE_ADMIN_PASSWORD")

	dbURL := os.Getenv("DATABASE_URL")
	if pbURL == "" && dbURL == "" {
		log.Println("⚠️ Warning: Neither POCKETBASE_URL nor DATABASE_URL environment variable is provided from Infisical")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = os.Getenv("APP_JWT_SECRET")
	}
	if jwtSecret == "" {
		log.Println("⚠️ Warning: JWT_SECRET environment variable is not set from Infisical")
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
	if adminEmail == "" {
		adminEmail = pbEmail
	}

	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = os.Getenv("SUPER_ADMIN_PASSWORD")
	}
	if adminPassword == "" {
		adminPassword = pbPassword
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
		DatabaseURL:             dbURL,
		DatabaseSchema:          dbSchema,
		PocketBaseURL:           pbURL,
		PocketBaseAdminEmail:    pbEmail,
		PocketBaseAdminPassword: pbPassword,
		JWTSecret:               jwtSecret,
		CorsOrigins:             corsOrigins,
		Port:                    port,
		AdminEmail:              adminEmail,
		AdminPassword:           adminPassword,
		TurnstileSecretKey:      turnstileSecretKey,
	}
}
