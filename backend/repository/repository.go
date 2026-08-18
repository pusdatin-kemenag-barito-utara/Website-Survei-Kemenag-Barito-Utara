package repository

import (
	"strings"
	"time"

	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

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
	// View-based aggregation queries (reads from DB views for accuracy & performance)
	GetViewIndexSummary() ([]domain.ViewIndexSummaryRow, error)
	GetViewUnsurSummary() ([]domain.ViewUnsurSummaryRow, error)
	GetViewServiceStats() ([]domain.ViewServiceStatRow, error)
	GetIndexTrend() ([]domain.IndexTrendRow, error)
	GetDemographicSummary() ([]domain.DemographicSummaryRow, error)
	ListResponsesPaginated(serviceID, periodID, dateFrom, dateTo, search string, limit, offset int) ([]models.Response, int64, error)
	DeleteResponseFull(id uuid.UUID) error

	GetResponseAnswersDetail(id uuid.UUID) ([]domain.AnswerDetailResult, error)
	GetResponseDemographicsDetail(id uuid.UUID) ([]domain.DemoDetailResult, error)

	// Audit Log Operations
	WriteAuditLog(log *models.AuditLog) error
	ListAuditLogs(limit, offset int) ([]models.AuditLog, int64, error)

	// Auth User Operations (Database Supabase Auth)
	GetAuthUserByEmail(email string) (*domain.AuthUserRecord, error)
}



type gormRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &gormRepository{db: db}
}

func (r *gormRepository) DB() *gorm.DB {
	return r.db
}

// Period Repository Methods
func (r *gormRepository) GetActivePeriod() (*models.SurveyPeriod, error) {
	now := time.Now().Format("2006-01-02")
	var period models.SurveyPeriod

	// 1. Check if there is a designated active period
	err := r.db.Where("is_active = ?", true).First(&period).Error
	if err == nil {
		pStart := strings.Split(period.StartDate, "T")[0]
		pEnd := strings.Split(period.EndDate, "T")[0]

		// If current active period is still within date range, return it immediately
		if now >= pStart && now <= pEnd {
			return &period, nil
		}

		// If it has expired (now > pEnd), auto-deactivate it so rollover can take place
		r.db.Model(&models.SurveyPeriod{}).Where("id = ?", period.ID).Update("is_active", false)
	}

	// 2. Automatically find and activate the period matching TODAY's date (prioritize triwulan)
	var currentPeriod models.SurveyPeriod
	err = r.db.Where("start_date <= ? AND end_date >= ? AND period_type = ?", now, now, "triwulan").
		Order("start_date desc").First(&currentPeriod).Error

	if err != nil {
		// Fallback to any period type covering today (e.g. semester or tahunan)
		err = r.db.Where("start_date <= ? AND end_date >= ?", now, now).
			Order("start_date desc").First(&currentPeriod).Error
	}

	if err == nil {
		// Auto-activate this current period in DB so future queries and admin UI reflect it
		r.db.Model(&models.SurveyPeriod{}).Where("1 = 1").Update("is_active", false)
		r.db.Model(&models.SurveyPeriod{}).Where("id = ?", currentPeriod.ID).Update("is_active", true)
		currentPeriod.IsActive = true
		return &currentPeriod, nil
	}

	// 3. Fallback: if no period matches today, return the most recent active or available period
	var latestPeriod models.SurveyPeriod
	if err := r.db.Order("end_date desc, created_at desc").First(&latestPeriod).Error; err == nil {
		return &latestPeriod, nil
	}

	return nil, err
}

func (r *gormRepository) ListPeriods() ([]models.SurveyPeriod, error) {
	// Sync active period based on date before listing
	_, _ = r.GetActivePeriod()

	var periods []models.SurveyPeriod
	err := r.db.Order("start_date asc, created_at desc").Find(&periods).Error
	return periods, err
}

func (r *gormRepository) CreatePeriod(period *models.SurveyPeriod) error {
	if period.IsActive {
		r.db.Model(&models.SurveyPeriod{}).Where("id != ?", uuid.Nil).Update("is_active", false)
	}
	return r.db.Create(period).Error
}

func (r *gormRepository) UpdatePeriod(id uuid.UUID, period *models.SurveyPeriod) (*models.SurveyPeriod, error) {
	tx := r.db.Begin()
	if period.IsActive {
		tx.Model(&models.SurveyPeriod{}).Where("1 = 1").Update("is_active", false)
	}

	var existing models.SurveyPeriod
	if err := tx.First(&existing, id).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	existing.PeriodType = period.PeriodType
	existing.Label = period.Label
	existing.StartDate = period.StartDate
	existing.EndDate = period.EndDate
	existing.IsActive = period.IsActive

	if err := tx.Save(&existing).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return &existing, nil
}

func (r *gormRepository) SetPeriodActive(id uuid.UUID) error {

	tx := r.db.Begin()
	tx.Model(&models.SurveyPeriod{}).Where("1 = 1").Update("is_active", false)
	if err := tx.Model(&models.SurveyPeriod{}).Where("id = ?", id).Update("is_active", true).Error; err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

func (r *gormRepository) DeletePeriod(id uuid.UUID) error {
	return r.db.Delete(&models.SurveyPeriod{}, id).Error
}

// Service Repository Methods
func (r *gormRepository) ListActiveServices() ([]models.Service, error) {
	var services []models.Service
	err := r.db.Where("is_active = ?", true).Order("sort_order asc").Find(&services).Error
	return services, err
}

func (r *gormRepository) ListAllServicesAdmin() ([]models.Service, error) {
	var services []models.Service
	err := r.db.Order("sort_order asc").Find(&services).Error
	return services, err
}

func (r *gormRepository) ListServiceCategories() ([]models.ServiceCategory, error) {
	var categories []models.ServiceCategory
	err := r.db.Order("sort_order asc").Find(&categories).Error
	return categories, err
}

func (r *gormRepository) CreateService(service *models.Service) error {
	return r.db.Create(service).Error
}

func (r *gormRepository) UpdateService(id uuid.UUID, service *models.Service) (*models.Service, error) {
	var s models.Service
	if err := r.db.First(&s, id).Error; err != nil {
		return nil, err
	}
	service.ID = s.ID
	if err := r.db.Save(service).Error; err != nil {
		return nil, err
	}
	return service, nil
}

func (r *gormRepository) DeleteService(id uuid.UUID) error {
	return r.db.Delete(&models.Service{}, id).Error
}

// Unsur Repository Methods
func (r *gormRepository) ListUnsur() ([]models.Unsur, error) {
	var list []models.Unsur
	err := r.db.Order("sort_order asc").Find(&list).Error
	return list, err
}

func (r *gormRepository) CreateUnsur(item *models.Unsur) error {
	return r.db.Create(item).Error
}

func (r *gormRepository) UpdateUnsur(id uuid.UUID, item *models.Unsur) (*models.Unsur, error) {
	var existing models.Unsur
	if err := r.db.First(&existing, id).Error; err != nil {
		return nil, err
	}
	item.ID = existing.ID
	if err := r.db.Save(item).Error; err != nil {
		return nil, err
	}
	return item, nil
}

func (r *gormRepository) DeleteUnsur(id uuid.UUID) error {
	return r.db.Delete(&models.Unsur{}, id).Error
}

// Questions Repository Methods
func (r *gormRepository) ListActiveQuestions() ([]models.Question, error) {
	var questions []models.Question
	err := r.db.Preload("Unsur").Where("is_active = ?", true).Order("sort_order asc").Find(&questions).Error
	return questions, err
}

func (r *gormRepository) ListAllQuestions() ([]models.Question, error) {
	var list []models.Question
	err := r.db.Preload("Unsur").Order("sort_order asc").Find(&list).Error
	return list, err
}

func (r *gormRepository) CreateQuestion(q *models.Question) error {
	return r.db.Create(q).Error
}

func (r *gormRepository) UpdateQuestion(id uuid.UUID, q *models.Question) (*models.Question, error) {
	var existing models.Question
	if err := r.db.First(&existing, id).Error; err != nil {
		return nil, err
	}
	q.ID = existing.ID
	if err := r.db.Save(q).Error; err != nil {
		return nil, err
	}
	return q, nil
}

func (r *gormRepository) DeleteQuestion(id uuid.UUID) error {
	return r.db.Delete(&models.Question{}, id).Error
}

// Demographic Fields Repository Methods
func (r *gormRepository) ListActiveDemographicFields() ([]models.DemographicField, error) {
	var demoFields []models.DemographicField
	err := r.db.Preload("Options", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order asc")
	}).Where("is_active = ?", true).Order("sort_order asc").Find(&demoFields).Error
	return demoFields, err
}

func (r *gormRepository) ListAllDemographicFieldsAdmin() ([]models.DemographicField, error) {
	var demoFields []models.DemographicField
	err := r.db.Preload("Options", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order asc")
	}).Order("sort_order asc").Find(&demoFields).Error
	return demoFields, err
}

func (r *gormRepository) CreateDemographicField(field *models.DemographicField) error {
	return r.db.Create(field).Error
}

func (r *gormRepository) UpdateDemographicField(id uuid.UUID, field *models.DemographicField) (*models.DemographicField, error) {
	var existing models.DemographicField
	if err := r.db.First(&existing, id).Error; err != nil {
		return nil, err
	}
	existing.FieldKey = field.FieldKey
	existing.LabelID = field.LabelID
	existing.LabelEN = field.LabelEN
	existing.FieldType = field.FieldType
	existing.IsRequired = field.IsRequired
	existing.IsActive = field.IsActive
	existing.SortOrder = field.SortOrder

	if err := r.db.Save(&existing).Error; err != nil {
		return nil, err
	}
	return &existing, nil
}

func (r *gormRepository) DeleteDemographicField(id uuid.UUID) error {
	tx := r.db.Begin()
	if err := tx.Where("field_id = ?", id).Delete(&models.DemographicOption{}).Error; err != nil {
		tx.Rollback()
		return err
	}
	if err := tx.Delete(&models.DemographicField{}, id).Error; err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

func (r *gormRepository) ListDemographicOptionsByField(fieldID uuid.UUID) ([]models.DemographicOption, error) {
	var options []models.DemographicOption
	err := r.db.Where("field_id = ?", fieldID).Order("sort_order asc").Find(&options).Error
	return options, err
}

func (r *gormRepository) CreateDemographicOption(opt *models.DemographicOption) error {
	return r.db.Create(opt).Error
}

func (r *gormRepository) UpdateDemographicOption(id uuid.UUID, opt *models.DemographicOption) (*models.DemographicOption, error) {
	var existing models.DemographicOption
	if err := r.db.First(&existing, id).Error; err != nil {
		return nil, err
	}
	existing.Value = opt.Value
	existing.LabelID = opt.LabelID
	existing.LabelEN = opt.LabelEN
	existing.SortOrder = opt.SortOrder

	if err := r.db.Save(&existing).Error; err != nil {
		return nil, err
	}
	return &existing, nil
}

func (r *gormRepository) DeleteDemographicOption(id uuid.UUID) error {
	return r.db.Delete(&models.DemographicOption{}, id).Error
}


// App Settings Repository Methods
func (r *gormRepository) GetAppSettingsMap() (map[string]string, error) {
	var settings []models.AppSetting
	if err := r.db.Find(&settings).Error; err != nil {
		return nil, err
	}
	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	return result, nil
}

func (r *gormRepository) UpdateAppSettings(body map[string]string) error {
	for k, v := range body {
		setting := models.AppSetting{Key: k, Value: v}
		if err := r.db.Save(&setting).Error; err != nil {
			return err
		}
	}
	return nil
}

// Response & Stats Repository Methods
func (r *gormRepository) CountTotalResponses() (int64, error) {
	var count int64
	err := r.db.Model(&models.Response{}).Count(&count).Error
	return count, err
}

func (r *gormRepository) CountActiveServices() (int64, error) {
	var count int64
	err := r.db.Model(&models.Service{}).Where("is_active = ?", true).Count(&count).Error
	return count, err
}

func (r *gormRepository) CountActiveUnsur() (int64, error) {
	var count int64
	err := r.db.Model(&models.Unsur{}).Where("is_active = ?", true).Count(&count).Error
	return count, err
}

func (r *gormRepository) GetAnswerUnsurRawList() ([]domain.AnswerUnsurRaw, error) {
	var results []domain.AnswerUnsurRaw
	err := r.db.Raw(`
		SELECT ra.rating_value, u.index_type
		FROM kemenag_survey.response_answers ra
		JOIN kemenag_survey.unsur u ON u.id = ra.unsur_id
	`).Scan(&results).Error
	return results, err
}

func (r *gormRepository) GetUnsurAvgRating(unsurID uuid.UUID) (float64, error) {
	var avgRating float64
	err := r.db.Table("kemenag_survey.response_answers").
		Where("unsur_id = ?", unsurID).
		Select("COALESCE(AVG(rating_value), 0)").
		Scan(&avgRating).Error
	return avgRating, err
}

func (r *gormRepository) GetServiceResponseCount(serviceID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.Response{}).Where("service_id = ?", serviceID).Count(&count).Error
	return count, err
}

func (r *gormRepository) GetServiceAvgRating(serviceID uuid.UUID, indexType string) (float64, error) {
	var avgRating float64
	err := r.db.Table("kemenag_survey.response_answers").
		Joins("JOIN kemenag_survey.responses ON kemenag_survey.responses.id = kemenag_survey.response_answers.response_id").
		Joins("JOIN kemenag_survey.unsur ON kemenag_survey.unsur.id = kemenag_survey.response_answers.unsur_id").
		Where("kemenag_survey.responses.service_id = ? AND kemenag_survey.unsur.index_type = ?", serviceID, indexType).
		Select("COALESCE(AVG(kemenag_survey.response_answers.rating_value), 0)").
		Scan(&avgRating).Error
	return avgRating, err
}

func (r *gormRepository) ListResponsesPaginated(serviceID, periodID, dateFrom, dateTo, search string, limit, offset int) ([]models.Response, int64, error) {
	query := r.db.Model(&models.Response{})
	if serviceID != "" {
		query = query.Where("service_id = ?", serviceID)
	}
	if periodID != "" {
		query = query.Where("period_id = ?", periodID)
	}
	if dateFrom != "" {
		query = query.Where("submitted_at::date >= ?::date", dateFrom)
	}
	if dateTo != "" {
		query = query.Where("submitted_at::date <= ?::date", dateTo)
	}

	if search != "" {
		query = query.Where("respondent_name ILIKE ? OR respondent_contact ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var responses []models.Response
	err := query.Preload("Service").Preload("Period").Order("submitted_at desc").Limit(limit).Offset(offset).Find(&responses).Error
	return responses, total, err
}


func (r *gormRepository) DeleteResponseFull(id uuid.UUID) error {
	tx := r.db.Begin()

	if err := tx.Where("response_id = ?", id).Delete(&models.ResponseAnswer{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Where("response_id = ?", id).Delete(&models.ResponseDemographic{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Where("id = ?", id).Delete(&models.Response{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

func (r *gormRepository) GetResponseAnswersDetail(id uuid.UUID) ([]domain.AnswerDetailResult, error) {
	var results []domain.AnswerDetailResult
	err := r.db.Table("kemenag_survey.response_answers").
		Select("kemenag_survey.response_answers.id, kemenag_survey.response_answers.rating_value, kemenag_survey.questions.question_text_id, kemenag_survey.questions.question_text_en, kemenag_survey.unsur.name as unsur_name, kemenag_survey.unsur.index_type").
		Joins("JOIN kemenag_survey.questions ON kemenag_survey.questions.id = kemenag_survey.response_answers.question_id").
		Joins("JOIN kemenag_survey.unsur ON kemenag_survey.unsur.id = kemenag_survey.response_answers.unsur_id").
		Where("kemenag_survey.response_answers.response_id = ?", id).
		Order("kemenag_survey.questions.sort_order asc").
		Scan(&results).Error
	return results, err
}

func (r *gormRepository) GetResponseDemographicsDetail(id uuid.UUID) ([]domain.DemoDetailResult, error) {
	var results []domain.DemoDetailResult
	err := r.db.Table("kemenag_survey.response_demographics").
		Select("kemenag_survey.response_demographics.id, kemenag_survey.response_demographics.value, kemenag_survey.demographic_fields.label_id, kemenag_survey.demographic_fields.label_en, kemenag_survey.demographic_fields.field_key").
		Joins("JOIN kemenag_survey.demographic_fields ON kemenag_survey.demographic_fields.id = kemenag_survey.response_demographics.field_id").
		Where("kemenag_survey.response_demographics.response_id = ?", id).
		Order("kemenag_survey.demographic_fields.sort_order asc").
		Scan(&results).Error
	return results, err
}

// GetIndexTrend returns weekly aggregated index scores with weighted NRR per index_type
func (r *gormRepository) GetIndexTrend() ([]domain.IndexTrendRow, error) {
	var results []domain.IndexTrendRow
	err := r.db.Raw(`
		WITH weekly AS (
			SELECT
				date_trunc('week', r.submitted_at) AS periode_date,
				ra.unsur_id,
				u.index_type,
				avg(ra.rating_value::numeric) AS avg_rating
			FROM kemenag_survey.responses r
			JOIN kemenag_survey.response_answers ra ON ra.response_id = r.id
			JOIN kemenag_survey.unsur u ON u.id = ra.unsur_id
			WHERE u.is_active = true
			GROUP BY date_trunc('week', r.submitted_at), ra.unsur_id, u.index_type
		), aktif_unsur AS (
			SELECT index_type, count(*) AS total FROM kemenag_survey.unsur WHERE is_active = true GROUP BY index_type
		), tertimbang AS (
			SELECT w.periode_date, w.index_type, (w.avg_rating / au.total::numeric) AS weighted
			FROM weekly w JOIN aktif_unsur au ON au.index_type = w.index_type
		)
		SELECT
			TO_CHAR(t.periode_date, 'YYYY-MM-DD') AS bulan,
			t.index_type,
			round((sum(t.weighted) * 25::numeric), 2) AS nilai_konversi
		FROM tertimbang t
		GROUP BY t.periode_date, t.index_type
		ORDER BY t.periode_date ASC
	`).Scan(&results).Error
	return results, err
}


// GetDemographicSummary reads from vw_demographic_summary view
func (r *gormRepository) GetDemographicSummary() ([]domain.DemographicSummaryRow, error) {
	var results []domain.DemographicSummaryRow
	err := r.db.Raw(`
		SELECT
			service_id::text,
			service_name,
			field_key,
			demographic_value,
			count
		FROM kemenag_survey.vw_demographic_summary
		ORDER BY service_name, field_key, count DESC
	`).Scan(&results).Error
	return results, err
}

// GetViewIndexSummary reads from vw_index_summary (weighted NRR calculation)
func (r *gormRepository) GetViewIndexSummary() ([]domain.ViewIndexSummaryRow, error) {
	var results []domain.ViewIndexSummaryRow
	err := r.db.Raw(`
		SELECT index_type, nilai_index, nilai_konversi, mutu, kinerja
		FROM kemenag_survey.vw_index_summary
	`).Scan(&results).Error
	return results, err
}

// GetViewUnsurSummary reads from vw_unsur_summary view
func (r *gormRepository) GetViewUnsurSummary() ([]domain.ViewUnsurSummaryRow, error) {
	var results []domain.ViewUnsurSummaryRow
	err := r.db.Raw(`
		SELECT
			service_id::text,
			service_name,
			unsur_id::text,
			unsur_name,
			index_type,
			jumlah_pertanyaan,
			total_nilai,
			nilai_rata_rata_unsur,
			nilai_rata_rata_tertimbang,
			jumlah_responden
		FROM kemenag_survey.vw_unsur_summary
		ORDER BY index_type, unsur_name
	`).Scan(&results).Error
	return results, err
}


// GetViewServiceStats reads from vw_index_summary_by_service view
func (r *gormRepository) GetViewServiceStats() ([]domain.ViewServiceStatRow, error) {
	var results []domain.ViewServiceStatRow
	err := r.db.Raw(`
		SELECT
			service_id::text,
			service_name,
			index_type,
			nilai_index,
			nilai_konversi,
			mutu,
			jumlah_responden
		FROM kemenag_survey.vw_index_summary_by_service
		ORDER BY service_name, index_type
	`).Scan(&results).Error
	return results, err
}

// --- Service Category CRUD ---

func (r *gormRepository) CreateServiceCategory(cat *models.ServiceCategory) error {
	return r.db.Create(cat).Error
}

func (r *gormRepository) UpdateServiceCategory(id uuid.UUID, cat *models.ServiceCategory) (*models.ServiceCategory, error) {
	var existing models.ServiceCategory
	if err := r.db.First(&existing, "id = ?", id).Error; err != nil {
		return nil, err
	}
	existing.Name = cat.Name
	existing.SortOrder = cat.SortOrder
	if err := r.db.Save(&existing).Error; err != nil {
		return nil, err
	}
	return &existing, nil
}

func (r *gormRepository) DeleteServiceCategory(id uuid.UUID) error {
	return r.db.Delete(&models.ServiceCategory{}, "id = ?", id).Error
}

// --- Audit Log ---

func (r *gormRepository) WriteAuditLog(log *models.AuditLog) error {
	if log.Details == "" {
		log.Details = "{}"
	}
	return r.db.Create(log).Error
}

func (r *gormRepository) ListAuditLogs(limit, offset int) ([]models.AuditLog, int64, error) {
	var logs []models.AuditLog
	var total int64
	if err := r.db.Model(&models.AuditLog{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := r.db.Order("created_at desc").Limit(limit).Offset(offset).Find(&logs).Error
	return logs, total, err
}

// GetAuthUserByEmail queries Supabase auth.users table for authentication
func (r *gormRepository) GetAuthUserByEmail(email string) (*domain.AuthUserRecord, error) {
	var user domain.AuthUserRecord
	err := r.db.Raw(`
		SELECT id::text, email, encrypted_password, role
		FROM auth.users
		WHERE email = ?
		LIMIT 1
	`, email).Scan(&user).Error
	if err != nil {
		return nil, err
	}
	if user.ID == "" {
		return nil, gorm.ErrRecordNotFound
	}
	return &user, nil
}

