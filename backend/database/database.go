package database

import (
	"fmt"
	"log"
	"time"
	"survey-kemenag-backend/config"
	"survey-kemenag-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

var DB *gorm.DB

func ConnectDB(cfg *config.Config) {
	var err error
	dbSchema := cfg.DatabaseSchema
	if dbSchema == "" {
		dbSchema = "kemenag_survey"
	}
	models.SetSchema(dbSchema)

	DB, err = gorm.Open(postgres.New(postgres.Config{
		DSN:                  cfg.DatabaseURL,
		PreferSimpleProtocol: true, // Disables prepared statement caching for Supabase/pgBouncer
	}), &gorm.Config{
		Logger:      logger.Default.LogMode(logger.Error), // Only log critical SQL errors, hide slow query warnings
		PrepareStmt: false,                                // Prevent prepared statement caching completely
		NamingStrategy: schema.NamingStrategy{
			TablePrefix:   dbSchema + ".", // Direct GORM queries to configured schema
			SingularTable: false,
		},
	})

	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxOpenConns(25)
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetConnMaxLifetime(15 * time.Minute)
		sqlDB.SetConnMaxIdleTime(5 * time.Minute)
	}

	// Sync schema column migrations (e.g. ipkp_feedback & ipak_feedback)
	DB.AutoMigrate(&models.Response{})

	// Ensure high-performance composite and trigram indexes for long-term scalability
	go func() {
		// 1. Enable pg_trgm extension
		DB.Exec("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

		indexes := []string{
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_responses_submitted_at ON %s.responses (submitted_at DESC);", dbSchema),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_responses_service_period ON %s.responses (service_id, period_id);", dbSchema),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_responses_submitted_date ON %s.responses (((submitted_at AT TIME ZONE 'UTC')::date));", dbSchema),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_responses_name_trgm ON %s.responses USING gin (respondent_name gin_trgm_ops);", dbSchema),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_responses_contact_trgm ON %s.responses USING gin (respondent_contact gin_trgm_ops);", dbSchema),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_response_answers_response_id ON %s.response_answers (response_id);", dbSchema),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_response_answers_unsur_id ON %s.response_answers (unsur_id);", dbSchema),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_response_answers_comp_calc ON %s.response_answers (unsur_id, rating_value, response_id);", dbSchema),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_response_answers_resp_unsur ON %s.response_answers (response_id, unsur_id);", dbSchema),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_response_demographics_response_id ON %s.response_demographics (response_id);", dbSchema),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_response_demographics_field_val ON %s.response_demographics (field_id, value, response_id);", dbSchema),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_questions_unsur_id ON %s.questions (unsur_id);", dbSchema),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_questions_is_active ON %s.questions (is_active, sort_order);", dbSchema),
		}
		for _, q := range indexes {
			DB.Exec(q)
		}
		log.Println("⚡ Database indexes verified and optimized for high performance.")
	}()

	log.Println("✅ Successfully connected to PostgreSQL Database (schema: kemenag_survey)")
}
