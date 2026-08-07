package routes

import (
	"time"

	"survey-kemenag-backend/config"
	"survey-kemenag-backend/database"
	"survey-kemenag-backend/handlers"
	"survey-kemenag-backend/middleware"
	"survey-kemenag-backend/repository"
	"survey-kemenag-backend/service"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

func SetupRoutes(app *fiber.App) {
	cfg := config.LoadConfig()
	
	// Initialize Repository & Services
	repo := repository.NewRepository(database.DB)
	surveyService := service.NewSurveyService(repo)

	// Initialize Handlers with Dependency Injection
	authHandler := handlers.NewAuthHandler(cfg, repo)

	statsHandler := handlers.NewStatsHandler(surveyService)
	periodHandler := handlers.NewPeriodHandler(repo)
	serviceHandler := handlers.NewServiceHandler(repo)
	questionHandler := handlers.NewQuestionHandler(repo)
	responseHandler := handlers.NewResponseHandler(repo, surveyService)
	settingHandler := handlers.NewSettingHandler(repo)
	categoryHandler := handlers.NewServiceCategoryHandler(repo)
	auditLogHandler := handlers.NewAuditLogHandler(repo)
	demographicHandler := handlers.NewDemographicHandler(repo)
	exportHandler := handlers.NewExportHandler(surveyService)



	// Rate Limiter for Login (Max 5 requests per 1 minute per IP)
	loginLimiter := limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Terlalu banyak percobaan login. Silakan tunggu 1 menit lagi.",
			})
		},
	})

	// Rate Limiter for Survey Submissions (Max 10 submissions per 1 minute per IP)
	submitLimiter := limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Terlalu banyak pengiriman survei dari IP ini. Silakan tunggu sebentar.",
			})
		},
	})

	// API Group /api/v1
	api := app.Group("/api/v1")

	// --- Public Routes ---
	api.Post("/auth/login", loginLimiter, authHandler.Login)
	api.Get("/survey/active-period", periodHandler.GetActivePeriod)
	api.Get("/survey/services", serviceHandler.GetServices)
	api.Get("/survey/form-questions", questionHandler.GetSurveyFormQuestions)
	api.Post("/survey/submit", submitLimiter, responseHandler.SubmitSurvey)
	api.Get("/survey/public-results", statsHandler.GetPublicResults)
	api.Get("/survey/archive-results", statsHandler.GetArchiveResults)
	api.Get("/settings", settingHandler.GetAppSettings)



	// --- Protected Admin Routes ---
	admin := api.Group("/admin", middleware.Protected(cfg))
	admin.Get("/me", authHandler.Me)
	admin.Get("/stats", statsHandler.GetAdminStats)

	// Admin - Audit Logs
	admin.Get("/audit-logs", auditLogHandler.List)

	// Admin - Survey Periods
	admin.Get("/periods", periodHandler.ListPeriods)
	admin.Post("/periods", periodHandler.CreatePeriod)
	admin.Put("/periods/:id", periodHandler.UpdatePeriod)
	admin.Patch("/periods/:id/active", periodHandler.SetPeriodActive)
	admin.Delete("/periods/:id", periodHandler.DeletePeriod)


	// Admin - Service Categories
	admin.Get("/service-categories", categoryHandler.List)
	admin.Post("/service-categories", categoryHandler.Create)
	admin.Put("/service-categories/:id", categoryHandler.Update)
	admin.Delete("/service-categories/:id", categoryHandler.Delete)

	// Admin - Services
	admin.Get("/services", serviceHandler.ListServicesAdmin)
	admin.Post("/services", serviceHandler.CreateService)
	admin.Put("/services/:id", serviceHandler.UpdateService)
	admin.Delete("/services/:id", serviceHandler.DeleteService)

	// Admin - Unsur
	admin.Get("/unsur", questionHandler.ListUnsur)
	admin.Post("/unsur", questionHandler.CreateUnsur)
	admin.Put("/unsur/:id", questionHandler.UpdateUnsur)
	admin.Delete("/unsur/:id", questionHandler.DeleteUnsur)

	// Admin - Questions
	admin.Get("/questions", questionHandler.ListQuestions)
	admin.Post("/questions", questionHandler.CreateQuestion)
	admin.Put("/questions/:id", questionHandler.UpdateQuestion)
	admin.Delete("/questions/:id", questionHandler.DeleteQuestion)

	// Admin - Responses
	admin.Get("/responses", responseHandler.ListResponsesAdmin)
	admin.Get("/responses/:id/answers", responseHandler.GetResponseAnswersAdmin)
	admin.Get("/responses/:id/demographics", responseHandler.GetResponseDemographicsAdmin)
	admin.Delete("/responses/:id", responseHandler.DeleteResponseAdmin)

	// Admin - Settings
	admin.Put("/settings", settingHandler.UpdateAppSetting)

	// Admin - Demographic Fields & Options
	admin.Get("/demographics", demographicHandler.ListFieldsAdmin)
	admin.Post("/demographics", demographicHandler.CreateField)
	admin.Put("/demographics/:id", demographicHandler.UpdateField)
	admin.Delete("/demographics/:id", demographicHandler.DeleteField)
	admin.Get("/demographics/:fieldId/options", demographicHandler.ListOptions)
	admin.Post("/demographics/options", demographicHandler.CreateOption)
	admin.Put("/demographics/options/:id", demographicHandler.UpdateOption)
	admin.Delete("/demographics/options/:id", demographicHandler.DeleteOption)

	// Admin - Export
	admin.Get("/export/excel", exportHandler.ExportResponsesExcel)
}


