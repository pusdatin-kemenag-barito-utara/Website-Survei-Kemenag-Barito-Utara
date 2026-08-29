package main

import (
	"log"

	"survey-kemenag-backend/config"
	"survey-kemenag-backend/database"
	"survey-kemenag-backend/routes"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Connect to PostgreSQL database
	database.ConnectDB(cfg)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "SIKAP Kemenag REST API v1.0",
		ServerHeader: "Fiber",
	})

	// Global Middlewares
	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed,
	}))
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format:     "[${time}] ${status} - ${latency} | ${ip} | ${method} ${path} ${error}\n",
		TimeFormat: "15:04:05",
		TimeZone:   "Local",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.GetCorsOrigins(),
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowCredentials: true,
		MaxAge:           86400, // Cache CORS preflight requests for 24 hours
	}))

	// HTTP/3 (QUIC), Cloudflare CDN Edge Caching & Security Protocol Headers
	app.Use(func(c fiber.Ctx) error {
		path := c.Path()
		method := c.Method()

		c.Set("Alt-Svc", `h3=":443"; ma=86400, h3-29=":443"; ma=86400`)
		c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "SAMEORIGIN")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Vary", "Accept-Encoding, Accept, Origin")

		// Cloudflare CDN Edge Cache control for API responses
		if method == "GET" && len(path) >= 15 && path[:15] == "/api/v1/survey/" {
			c.Set("Cache-Control", "public, max-age=15, s-maxage=60, stale-while-revalidate=300")
			c.Set("CDN-Cache-Control", "public, max-age=60, stale-while-revalidate=300")
		} else if len(path) >= 14 && (path[:14] == "/api/v1/admin/" || path[:13] == "/api/v1/auth/") {
			c.Set("Cache-Control", "private, no-cache, no-store, must-revalidate")
			c.Set("CDN-Cache-Control", "no-store")
		}

		return c.Next()
	})

	// Setup Routes
	routes.SetupRoutes(app)

	// Healthcheck endpoint for Uptime Kuma monitoring & VPS health checks
	app.Get("/health", func(c fiber.Ctx) error {
		dbStatus := "connected"
		if database.DB != nil {
			if sqlDB, err := database.DB.DB(); err != nil || sqlDB.Ping() != nil {
				dbStatus = "disconnected"
			}
		} else {
			dbStatus = "uninitialized"
		}

		status := fiber.StatusOK
		if dbStatus != "connected" {
			status = fiber.StatusServiceUnavailable
		}

		return c.Status(status).JSON(fiber.Map{
			"status":   "ok",
			"database": dbStatus,
			"service":  "SI-ARUS Kemenag Barito Utara Backend",
		})
	})

	// Start server
	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server running on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
