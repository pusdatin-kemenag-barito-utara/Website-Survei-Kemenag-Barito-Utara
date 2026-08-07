package domain

import (
	"math"
	"time"

	"github.com/google/uuid"
)

// Helper functions for Mutu calculations
func GetMutuLabel(konversi float64) string {
	if konversi >= 88.31 {
		return "A"
	} else if konversi >= 76.61 {
		return "B"
	} else if konversi >= 65.00 {
		return "C"
	}
	return "D"
}

func GetMutuText(konversi float64) string {
	if konversi >= 88.31 {
		return "Sangat Baik"
	} else if konversi >= 76.61 {
		return "Baik"
	} else if konversi >= 65.00 {
		return "Kurang Baik"
	}
	return "Tidak Baik"
}

func RoundTwoDecimals(val float64) float64 {
	return math.Round(val*100) / 100
}

// DTOs
type SubmitSurveyRequest struct {
	ServiceID         string            `json:"service_id"`
	IsAnonymous       bool              `json:"is_anonymous"`
	RespondentName    string            `json:"respondent_name"`
	RespondentContact string            `json:"respondent_contact"`
	Locale            string            `json:"locale"`
	IPKPFeedback      string            `json:"ipkp_feedback"`
	IPAKFeedback      string            `json:"ipak_feedback"`
	Demographics      map[string]string `json:"demographics"`
	Answers           map[string]int    `json:"answers"` // question_id -> rating_value (1-4)
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UnsurStat struct {
	ServiceID          string  `json:"service_id,omitempty"`
	ServiceName        string  `json:"service_name,omitempty"`
	UnsurID            string  `json:"unsur_id"`
	UnsurName          string  `json:"unsur_name"`
	IndexType          string  `json:"index_type"`
	Score              float64 `json:"nilai_konversi"`
	NRR                float64 `json:"nrr_unsur"`
	NilaiRataRataUnsur float64 `json:"nilai_rata_rata_unsur"`
	Mutu               string  `json:"kategori_mutu"`
	JumlahPertanyaan   int     `json:"jumlah_pertanyaan"`
	TotalNilai         float64 `json:"total_nilai"`
	JumlahResponden    int64   `json:"jumlah_responden"`
}

type ByServiceStat struct {
	ServiceID       string  `json:"service_id"`
	ServiceName     string  `json:"service_name"`
	IndexType       string  `json:"index_type"`
	NilaiIndex      float64 `json:"nilai_index"`
	NilaiKonversi   float64 `json:"nilai_konversi"`
	Mutu            string  `json:"mutu"`
	JumlahResponden int64   `json:"jumlah_responden"`
}

type AnswerDetailResult struct {
	ID             uuid.UUID `json:"id"`
	RatingValue    int       `json:"rating_value"`
	QuestionTextID string    `json:"question_text_id"`
	QuestionTextEN string    `json:"question_text_en"`
	UnsurName      string    `json:"unsur_name"`
	IndexType      string    `json:"index_type"`
}

type DemoDetailResult struct {
	ID       uuid.UUID `json:"id"`
	Value    string    `json:"value"`
	LabelID  string    `json:"label_id"`
	LabelEN  string    `json:"label_en"`
	FieldKey string    `json:"field_key"`
}

type AnswerUnsurRaw struct {
	RatingValue int    `gorm:"column:rating_value"`
	IndexType   string `gorm:"column:index_type"`
}

type SurveyPeriod struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	PeriodType string    `gorm:"type:text;not null" json:"period_type"`
	Label      string    `gorm:"type:text;not null" json:"label"`
	StartDate  string    `gorm:"type:date;not null" json:"start_date"`
	EndDate    string    `gorm:"type:date;not null" json:"end_date"`
	IsActive   bool      `gorm:"type:boolean;not null;default:false" json:"is_active"`
	CreatedAt  time.Time `gorm:"type:timestamptz;not null;default:now()" json:"created_at"`
}

func (SurveyPeriod) TableName() string {
	return "kemenag_survey.survey_periods"
}

// IndexTrendRow maps to vw_index_trend view
type IndexTrendRow struct {
	Bulan         string  `gorm:"column:bulan"          json:"bulan"`
	IndexType     string  `gorm:"column:index_type"     json:"index_type"`
	NilaiKonversi float64 `gorm:"column:nilai_konversi" json:"nilai_konversi"`
}

// DemographicSummaryRow maps to vw_demographic_summary view
type DemographicSummaryRow struct {
	ServiceID        string `gorm:"column:service_id"        json:"service_id"`
	ServiceName      string `gorm:"column:service_name"      json:"service_name"`
	FieldKey         string `gorm:"column:field_key"         json:"field_key"`
	DemographicValue string `gorm:"column:demographic_value" json:"demographic_value"`
	Count            int64  `gorm:"column:count"             json:"count"`
}

// ViewIndexSummaryRow maps to vw_index_summary view (weighted NRR calculation)
type ViewIndexSummaryRow struct {
	IndexType     string  `gorm:"column:index_type"      json:"index_type"`
	NilaiIndex    float64 `gorm:"column:nilai_index"     json:"nilai_index"`
	NilaiKonversi float64 `gorm:"column:nilai_konversi"  json:"nilai_konversi"`
	Mutu          string  `gorm:"column:mutu"            json:"mutu"`
	Kinerja       string  `gorm:"column:kinerja"         json:"kinerja"`
}

// ViewUnsurSummaryRow maps to vw_unsur_summary view
type ViewUnsurSummaryRow struct {
	ServiceID               string  `gorm:"column:service_id"              json:"service_id"`
	ServiceName             string  `gorm:"column:service_name"            json:"service_name"`
	UnsurID                 string  `gorm:"column:unsur_id"                json:"unsur_id"`
	UnsurName               string  `gorm:"column:unsur_name"              json:"unsur_name"`
	IndexType               string  `gorm:"column:index_type"              json:"index_type"`
	JumlahPertanyaan        int     `gorm:"column:jumlah_pertanyaan"       json:"jumlah_pertanyaan"`
	TotalNilai              float64 `gorm:"column:total_nilai"             json:"total_nilai"`
	NilaiRataRataUnsur      float64 `gorm:"column:nilai_rata_rata_unsur"   json:"nilai_rata_rata_unsur"`
	NilaiRataRataTertimbang float64 `gorm:"column:nilai_rata_rata_tertimbang" json:"nilai_rata_rata_tertimbang"`
	JumlahResponden         int64   `gorm:"column:jumlah_responden"        json:"jumlah_responden"`
}


// ViewServiceStatRow maps to vw_index_summary_by_service view
type ViewServiceStatRow struct {
	ServiceID       string  `gorm:"column:service_id"       json:"service_id"`
	ServiceName     string  `gorm:"column:service_name"     json:"service_name"`
	IndexType       string  `gorm:"column:index_type"       json:"index_type"`
	NilaiIndex      float64 `gorm:"column:nilai_index"      json:"nilai_index"`
	NilaiKonversi   float64 `gorm:"column:nilai_konversi"   json:"nilai_konversi"`
	Mutu            string  `gorm:"column:mutu"             json:"mutu"`
	JumlahResponden int64   `gorm:"column:jumlah_responden" json:"jumlah_responden"`
}

// AuditLog maps to kemenag_survey.audit_logs table
type AuditLog struct {
	UserEmail  string `gorm:"column:user_email"  json:"user_email"`
	Action     string `gorm:"column:action"      json:"action"`
	EntityName string `gorm:"column:entity_name" json:"entity_name"`
	EntityID   string `gorm:"column:entity_id"   json:"entity_id"`
	Details    string `gorm:"column:details;type:jsonb" json:"details,omitempty"`
}

// AuthUserRecord maps to auth.users table in Supabase PostgreSQL
type AuthUserRecord struct {
	ID                string `gorm:"column:id"`
	Email             string `gorm:"column:email"`
	EncryptedPassword string `gorm:"column:encrypted_password"`
	Role              string `gorm:"column:role"`
}

