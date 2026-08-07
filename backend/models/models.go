package models

import (
	"time"

	"github.com/google/uuid"
)

type ServiceCategory struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name      string    `gorm:"type:text;not null;unique" json:"name"`
	SortOrder int       `gorm:"type:int;not null;default:0" json:"sort_order"`
	CreatedAt time.Time `gorm:"type:timestamptz;not null;default:now()" json:"created_at"`
}

func (ServiceCategory) TableName() string {
	return "kemenag_survey.service_categories"
}

type Service struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"type:text;not null" json:"name"`
	Slug        string    `gorm:"type:text;not null;unique" json:"slug"`
	Description string    `gorm:"type:text" json:"description"`
	IsActive    bool      `gorm:"type:boolean;not null;default:true" json:"is_active"`
	SortOrder   int       `gorm:"type:int;not null;default:0" json:"sort_order"`
	CreatedAt   time.Time `gorm:"type:timestamptz;not null;default:now()" json:"created_at"`
	UpdatedAt   time.Time `gorm:"type:timestamptz;not null;default:now()" json:"updated_at"`
}

func (Service) TableName() string {
	return "kemenag_survey.services"
}

type SurveyPeriod struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	PeriodType string    `gorm:"type:text;not null" json:"period_type"` // triwulan, semester, tahunan
	Label      string    `gorm:"type:text;not null" json:"label"`
	StartDate  string    `gorm:"type:date;not null" json:"start_date"`
	EndDate    string    `gorm:"type:date;not null" json:"end_date"`
	IsActive   bool      `gorm:"type:boolean;not null;default:false" json:"is_active"`
	CreatedAt  time.Time `gorm:"type:timestamptz;not null;default:now()" json:"created_at"`
}

func (SurveyPeriod) TableName() string {
	return "kemenag_survey.survey_periods"
}

type Unsur struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	IndexType   string    `gorm:"type:text;not null" json:"index_type"` // IPKP, IPAK
	Name        string    `gorm:"type:text;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	SortOrder   int       `gorm:"type:int;not null;default:0" json:"sort_order"`
	IsActive    bool      `gorm:"type:boolean;not null;default:true" json:"is_active"`
	CreatedAt   time.Time `gorm:"type:timestamptz;not null;default:now()" json:"created_at"`
	UpdatedAt   time.Time `gorm:"type:timestamptz;not null;default:now()" json:"updated_at"`
}

func (Unsur) TableName() string {
	return "kemenag_survey.unsur"
}

type Question struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UnsurID        uuid.UUID  `gorm:"type:uuid;not null" json:"unsur_id"`
	ServiceID      *uuid.UUID `gorm:"type:uuid" json:"service_id,omitempty"`
	QuestionTextID string     `gorm:"type:text;not null" json:"question_text_id"`
	QuestionTextEN string     `gorm:"type:text;not null" json:"question_text_en"`
	InputType      string     `gorm:"type:text;not null;default:'star_rating'" json:"input_type"`
	RatingLabels   map[string]string `gorm:"type:jsonb;serializer:json" json:"rating_labels"`

	IsActive       bool       `gorm:"type:boolean;not null;default:true" json:"is_active"`
	SortOrder      int        `gorm:"type:int;not null;default:0" json:"sort_order"`
	CreatedAt      time.Time  `gorm:"type:timestamptz;not null;default:now()" json:"created_at"`
	UpdatedAt      time.Time  `gorm:"type:timestamptz;not null;default:now()" json:"updated_at"`

	Unsur Unsur `gorm:"foreignKey:UnsurID" json:"unsur,omitempty"`
}

func (Question) TableName() string {
	return "kemenag_survey.questions"
}

type DemographicField struct {
	ID         uuid.UUID           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	FieldKey   string              `gorm:"type:text;not null;unique" json:"field_key"`
	LabelID    string              `gorm:"type:text;not null" json:"label_id"`
	LabelEN    string              `gorm:"type:text;not null" json:"label_en"`
	FieldType  string              `gorm:"type:text;not null;default:'text'" json:"field_type"`
	IsRequired bool                `gorm:"type:boolean;not null;default:false" json:"is_required"`
	SortOrder  int                 `gorm:"type:int;not null;default:0" json:"sort_order"`
	IsActive   bool                `gorm:"type:boolean;not null;default:true" json:"is_active"`
	CreatedAt  time.Time           `gorm:"type:timestamptz;not null;default:now()" json:"created_at"`
	UpdatedAt  time.Time           `gorm:"type:timestamptz;not null;default:now()" json:"updated_at"`
	Options    []DemographicOption `gorm:"foreignKey:FieldID" json:"options,omitempty"`
}

func (DemographicField) TableName() string {
	return "kemenag_survey.demographic_fields"
}

type DemographicOption struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	FieldID   uuid.UUID `gorm:"type:uuid;not null" json:"field_id"`
	Value     string    `gorm:"type:text;not null" json:"value"`
	LabelID   string    `gorm:"type:text;not null" json:"label_id"`
	LabelEN   string    `gorm:"type:text;not null" json:"label_en"`
	SortOrder int       `gorm:"type:int;not null;default:0" json:"sort_order"`
}

func (DemographicOption) TableName() string {
	return "kemenag_survey.demographic_options"
}

type Response struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ServiceID         uuid.UUID `gorm:"type:uuid;not null" json:"service_id"`
	PeriodID          uuid.UUID `gorm:"type:uuid;not null" json:"period_id"`
	IsAnonymous       bool      `gorm:"type:boolean;not null;default:true" json:"is_anonymous"`
	RespondentName    string    `gorm:"type:text" json:"respondent_name"`
	RespondentContact string    `gorm:"type:text" json:"respondent_contact"`
	Locale            string    `gorm:"type:text;not null;default:'id'" json:"locale"`
	TurnstileVerified bool      `gorm:"type:boolean;not null;default:false" json:"turnstile_verified"`
	IPKPFeedback      string    `gorm:"column:ipkp_feedback;type:text" json:"ipkp_feedback,omitempty"`
	IPAKFeedback      string    `gorm:"column:ipak_feedback;type:text" json:"ipak_feedback,omitempty"`
	IPAddress         string    `gorm:"type:inet" json:"ip_address"`
	SubmittedAt       time.Time `gorm:"type:timestamptz;not null;default:now()" json:"submitted_at"`

	Service Service      `gorm:"foreignKey:ServiceID" json:"service,omitempty"`
	Period  SurveyPeriod `gorm:"foreignKey:PeriodID" json:"period,omitempty"`
}

func (Response) TableName() string {
	return "kemenag_survey.responses"
}

type ResponseDemographic struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ResponseID uuid.UUID `gorm:"type:uuid;not null" json:"response_id"`
	FieldID    uuid.UUID `gorm:"type:uuid;not null" json:"field_id"`
	Value      string    `gorm:"type:text;not null" json:"value"`
}

func (ResponseDemographic) TableName() string {
	return "kemenag_survey.response_demographics"
}

type ResponseAnswer struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ResponseID  uuid.UUID `gorm:"type:uuid;not null" json:"response_id"`
	QuestionID  uuid.UUID `gorm:"type:uuid;not null" json:"question_id"`
	UnsurID     uuid.UUID `gorm:"type:uuid;not null" json:"unsur_id"`
	RatingValue int       `gorm:"type:smallint;not null" json:"rating_value"`
}

func (ResponseAnswer) TableName() string {
	return "kemenag_survey.response_answers"
}

type AppSetting struct {
	Key       string    `gorm:"type:text;primaryKey" json:"key"`
	Value     string    `gorm:"type:text;not null" json:"value"`
	UpdatedAt time.Time `gorm:"type:timestamptz;not null;default:now()" json:"updated_at"`
}

func (AppSetting) TableName() string {
	return "kemenag_survey.app_settings"
}

type AuditLog struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserEmail  string    `gorm:"type:text"                                      json:"user_email"`
	Action     string    `gorm:"type:text;not null"                             json:"action"`
	EntityName string    `gorm:"type:text;not null"                             json:"entity_name"`
	EntityID   string    `gorm:"type:text"                                      json:"entity_id"`
	Details    string    `gorm:"type:jsonb"                                     json:"details,omitempty"`
	CreatedAt  time.Time `gorm:"type:timestamptz;not null;default:now()"        json:"created_at"`
}

func (AuditLog) TableName() string {
	return "kemenag_survey.audit_logs"
}
