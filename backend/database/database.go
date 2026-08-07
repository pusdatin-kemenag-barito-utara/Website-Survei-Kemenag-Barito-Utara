package database

import (
	"log"
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
	DB, err = gorm.Open(postgres.New(postgres.Config{
		DSN:                  cfg.DatabaseURL,
		PreferSimpleProtocol: true, // Disables prepared statement caching for Supabase/pgBouncer
	}), &gorm.Config{
		Logger:      logger.Default.LogMode(logger.Error), // Only log critical SQL errors, hide slow query warnings
		PrepareStmt: false,                                // Prevent prepared statement caching completely
		NamingStrategy: schema.NamingStrategy{
			TablePrefix:   "kemenag_survey.", // Direct GORM queries to kemenag_survey schema
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
		sqlDB.SetConnMaxLifetime(5 * 60 * 1000 * 1000 * 1000) // 5 minutes
	}

	// Sync schema column migrations (e.g. ipkp_feedback & ipak_feedback)
	DB.AutoMigrate(&models.Response{})

	log.Println("✅ Successfully connected to PostgreSQL Database (schema: kemenag_survey)")
}
