package main

import (
	"log"
	"os"

	"survey-kemenag-backend/config"
	"survey-kemenag-backend/database"
	"survey-kemenag-backend/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
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
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CorsOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS, PATCH",
		AllowCredentials: true,
		MaxAge:           86400, // Cache CORS preflight requests for 24 hours
	}))

	// HTTP/3 (QUIC) Discovery & Security Protocol Headers
	app.Use(func(c *fiber.Ctx) error {
		c.Set("Alt-Svc", `h3=":443"; ma=86400, h3-29=":443"; ma=86400`)
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "SAMEORIGIN")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		return c.Next()
	})

	// Setup Routes
	routes.SetupRoutes(app)

	// Healthcheck endpoint for Uptime Kuma monitoring & VPS health checks
	app.Get("/health", func(c *fiber.Ctx) error {
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
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server running on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
