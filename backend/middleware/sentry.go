package middleware

import (
	"log"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
	sentryfiber "github.com/getsentry/sentry-go/fiberv3"
	"github.com/gofiber/fiber/v3"
)

// InitSentry menginisialisasi Sentry client untuk Backend Golang (Fiber v3).
func InitSentry(dsn string) fiber.Handler {
	if dsn == "" {
		log.Println("ℹ️ Sentry DSN kosong, pemantauan Sentry backend dinonaktifkan")
		return func(c fiber.Ctx) error {
			return c.Next()
		}
	}

	env := os.Getenv("ENV")
	if env == "" {
		env = os.Getenv("NODE_ENV")
	}
	if env == "" {
		env = "development"
	}

	tracesRate := 1.0
	if env == "production" || env == "prod" {
		tracesRate = 0.2
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              dsn,
		EnableTracing:    true,
		TracesSampleRate: tracesRate,
		Environment:      env,
		ServerName:       "survei-backend-golang",
	})
	if err != nil {
		log.Printf("⚠️ Gagal inisialisasi Sentry: %v", err)
		return func(c fiber.Ctx) error {
			return c.Next()
		}
	}

	log.Printf("🛡️ Sentry Go Fiber v3 berhasil diinisialisasi (env: %s)", env)

	return sentryfiber.New(sentryfiber.Options{
		Repanic:         true,
		WaitForDelivery: true,
		Timeout:         2 * time.Second,
	})
}
