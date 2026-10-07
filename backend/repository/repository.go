package repository

import (
	"survey-kemenag-backend/database"
	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Repository defines the comprehensive data access interface for SI-ARUS
type Repository interface {
	DB() *gorm.DB

	// Survey Period Operations
	GetActivePeriod() (*models.SurveyPeriod, error)
	ListPeriods() ([]models.SurveyPeriod, error)
	CreatePeriod(period *models.SurveyPeriod) error
	UpdatePeriod(id uuid.UUID, period *models.SurveyPeriod) (*models.SurveyPeriod, error)
	SetPeriodActive(id uuid.UUID) error
	DeletePeriod(id uuid.UUID) error

	// Service Operations
	ListActiveServices() ([]models.Service, error)
	ListAllServicesAdmin() ([]models.Service, error)
	CreateService(service *models.Service) error
	UpdateService(id uuid.UUID, service *models.Service) (*models.Service, error)
	DeleteService(id uuid.UUID) error

	// Service Category Operations (CRUD)
	ListServiceCategories() ([]models.ServiceCategory, error)
	CreateServiceCategory(cat *models.ServiceCategory) error
	UpdateServiceCategory(id uuid.UUID, cat *models.ServiceCategory) (*models.ServiceCategory, error)
	DeleteServiceCategory(id uuid.UUID) error

	// Unsur Operations
	ListUnsur() ([]models.Unsur, error)
	CreateUnsur(item *models.Unsur) error
	UpdateUnsur(id uuid.UUID, item *models.Unsur) (*models.Unsur, error)
	DeleteUnsur(id uuid.UUID) error

	// Questions Operations
	ListActiveQuestions() ([]models.Question, error)
	ListAllQuestions() ([]models.Question, error)
	CreateQuestion(q *models.Question) error
	UpdateQuestion(id uuid.UUID, q *models.Question) (*models.Question, error)
	DeleteQuestion(id uuid.UUID) error

	// Demographic Fields Operations
	ListActiveDemographicFields() ([]models.DemographicField, error)
	ListAllDemographicFieldsAdmin() ([]models.DemographicField, error)
	CreateDemographicField(field *models.DemographicField) error
	UpdateDemographicField(id uuid.UUID, field *models.DemographicField) (*models.DemographicField, error)
	DeleteDemographicField(id uuid.UUID) error
	CreateDemographicOption(opt *models.DemographicOption) error
	UpdateDemographicOption(id uuid.UUID, opt *models.DemographicOption) (*models.DemographicOption, error)
	DeleteDemographicOption(id uuid.UUID) error
	ListDemographicOptionsByField(fieldID uuid.UUID) ([]models.DemographicOption, error)

	// App Settings Operations
	GetAppSettingsMap() (map[string]string, error)
	UpdateAppSettings(body map[string]string) error

	// Response & Stats Operations
	CountTotalResponses() (int64, error)
	CountActiveServices() (int64, error)
	CountActiveUnsur() (int64, error)
	GetAnswerUnsurRawList() ([]domain.AnswerUnsurRaw, error)
	GetUnsurAvgRating(unsurID uuid.UUID) (float64, error)
	GetServiceResponseCount(serviceID uuid.UUID) (int64, error)
	GetServiceAvgRating(serviceID uuid.UUID, indexType string) (float64, error)

	// View-based aggregation queries (reads from DB views or calculated in Go)
	GetViewIndexSummary() ([]domain.ViewIndexSummaryRow, error)
	GetViewUnsurSummary() ([]domain.ViewUnsurSummaryRow, error)
	GetViewServiceStats() ([]domain.ViewServiceStatRow, error)
	GetIndexTrend() ([]domain.IndexTrendRow, error)
	GetDemographicSummary() ([]domain.DemographicSummaryRow, error)
	ListResponsesPaginated(serviceID, periodID, dateFrom, dateTo, search string, limit, offset int) ([]models.Response, int64, error)
	DeleteResponseFull(id uuid.UUID) error
	SaveResponseFull(resp *models.Response, demoList []models.ResponseDemographic, answerList []models.ResponseAnswer) error
	GetArchiveRawAnswers(startDate, endDate string) (int64, []domain.CombinedRawAnswer, error)

	GetResponseAnswersDetail(id uuid.UUID) ([]domain.AnswerDetailResult, error)
	GetResponseDemographicsDetail(id uuid.UUID) ([]domain.DemoDetailResult, error)

	// Audit Log Operations
	WriteAuditLog(log *models.AuditLog) error
	ListAuditLogs(limit, offset int) ([]models.AuditLog, int64, error)

	// Auth User Operations
	GetAuthUserByEmail(email string) (*domain.AuthUserRecord, error)
	UpdateAuthUserPassword(email string, newHashedPassword string) error
}

// NewRepository initializes either PocketBase or GORM repository based on runtime database client
func NewRepository(db *gorm.DB) Repository {
	if database.PB != nil {
		return NewPocketBaseRepository(database.PB)
	}
	return NewGormRepository(db)
}
