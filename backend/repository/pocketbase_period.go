package repository

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/models"

	"github.com/google/uuid"
)

func mapPeriod(m map[string]interface{}) models.SurveyPeriod {
	idStr := getString(m, "id")
	origID := getString(m, "original_id")
	var uid uuid.UUID
	if origID != "" {
		uid = domain.PbIDToUUID(origID)
	} else {
		uid = domain.PbIDToUUID(idStr)
	}
	domain.RegisterIDMapping(idStr, uid)

	return models.SurveyPeriod{
		ID:         uid,
		PeriodType: getString(m, "period_type"),
		Label:      getString(m, "label"),
		StartDate:  getString(m, "start_date"),
		EndDate:    getString(m, "end_date"),
		IsActive:   getBool(m, "is_active"),
		CreatedAt:  parseTime(m["created"]),
	}
}

func (r *pocketbaseRepository) GetActivePeriod() (*models.SurveyPeriod, error) {
	now := time.Now().Format("2006-01-02")

	// 1. Check if there is an active period in PB.
	// Admin manual selection ALWAYS takes precedence, regardless of calendar dates!
	var list pbRecordList
	q := url.Values{}
	q.Set("filter", "is_active=true")
	q.Set("sort", "-start_date")
	q.Set("perPage", "10")
	if err := r.pb.Get("/api/collections/survey_periods/records", q, &list); err == nil && len(list.Items) > 0 {
		// Prioritize triwulan period if multiple are active
		for _, item := range list.Items {
			p := mapPeriod(item)
			if p.PeriodType == "triwulan" {
				return &p, nil
			}
		}
		// Otherwise return the first active period
		period := mapPeriod(list.Items[0])
		return &period, nil
	}

	// 2. Fallback ONLY if NO period is marked active in the database: find period covering today
	q = url.Values{}
	q.Set("sort", "-start_date")
	q.Set("perPage", "100")
	if err := r.pb.Get("/api/collections/survey_periods/records", q, &list); err == nil && len(list.Items) > 0 {
		for _, item := range list.Items {
			p := mapPeriod(item)
			pStart := strings.Split(p.StartDate, "T")[0]
			pEnd := strings.Split(p.EndDate, "T")[0]
			if now >= pStart && now <= pEnd {
				return &p, nil
			}
		}
		// 3. Fallback to latest
		latest := mapPeriod(list.Items[0])
		return &latest, nil
	}

	return nil, fmt.Errorf("no survey periods found")
}

func (r *pocketbaseRepository) ListPeriods() ([]models.SurveyPeriod, error) {
	if cached, ok := r.getMemCache("all_periods"); ok {
		return cached.([]models.SurveyPeriod), nil
	}
	var list pbRecordList
	q := url.Values{}
	q.Set("sort", "start_date")
	q.Set("perPage", "200")
	if err := r.pb.Get("/api/collections/survey_periods/records", q, &list); err != nil {
		return nil, err
	}
	res := make([]models.SurveyPeriod, 0, len(list.Items))
	for _, item := range list.Items {
		res = append(res, mapPeriod(item))
	}
	r.setMemCache("all_periods", res, 2*time.Minute)
	return res, nil
}

func (r *pocketbaseRepository) CreatePeriod(period *models.SurveyPeriod) error {
	if period.ID == uuid.Nil {
		period.ID = uuid.New()
	}
	pbID := domain.UUIDToPbID(period.ID.String())
	domain.RegisterIDMapping(pbID, period.ID)

	payload := map[string]interface{}{
		"id":          pbID,
		"period_type": period.PeriodType,
		"label":       period.Label,
		"start_date":  period.StartDate,
		"end_date":    period.EndDate,
		"is_active":   period.IsActive,
		"original_id": period.ID.String(),
	}
	return r.pb.Post("/api/collections/survey_periods/records", payload, nil)
}

func (r *pocketbaseRepository) UpdatePeriod(id uuid.UUID, period *models.SurveyPeriod) (*models.SurveyPeriod, error) {
	pbID := domain.UUIDToPbID(id.String())
	payload := map[string]interface{}{
		"period_type": period.PeriodType,
		"label":       period.Label,
		"start_date":  period.StartDate,
		"end_date":    period.EndDate,
		"is_active":   period.IsActive,
	}
	var updated map[string]interface{}
	if err := r.pb.Patch(fmt.Sprintf("/api/collections/survey_periods/records/%s", pbID), payload, &updated); err != nil {
		// Fallback patch by original_id
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/survey_periods/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			if patchErr := r.pb.Patch(fmt.Sprintf("/api/collections/survey_periods/records/%s", foundID), payload, &updated); patchErr != nil {
				return nil, patchErr
			}
		} else {
			return nil, err
		}
	}
	res := mapPeriod(updated)
	return &res, nil
}

func (r *pocketbaseRepository) SetPeriodActive(id uuid.UUID) error {
	periods, err := r.ListPeriods()
	if err == nil {
		for _, p := range periods {
			if p.IsActive {
				pbID := domain.UUIDToPbID(p.ID.String())
				_ = r.pb.Patch(fmt.Sprintf("/api/collections/survey_periods/records/%s", pbID), map[string]interface{}{"is_active": false}, nil)
			}
		}
	}
	targetPbID := domain.UUIDToPbID(id.String())
	if err := r.pb.Patch(fmt.Sprintf("/api/collections/survey_periods/records/%s", targetPbID), map[string]interface{}{"is_active": true}, nil); err != nil {
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), targetPbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/survey_periods/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			return r.pb.Patch(fmt.Sprintf("/api/collections/survey_periods/records/%s", foundID), map[string]interface{}{"is_active": true}, nil)
		}
		return err
	}
	return nil
}

func (r *pocketbaseRepository) DeletePeriod(id uuid.UUID) error {
	pbID := domain.UUIDToPbID(id.String())
	err := r.pb.Delete(fmt.Sprintf("/api/collections/survey_periods/records/%s", pbID))
	if err != nil {
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/survey_periods/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			err = r.pb.Delete(fmt.Sprintf("/api/collections/survey_periods/records/%s", foundID))
		}
	}
	return err
}
