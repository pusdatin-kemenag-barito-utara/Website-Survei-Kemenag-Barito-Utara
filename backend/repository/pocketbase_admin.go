package repository

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/models"
)

// ==========================================
// App Settings Operations
// ==========================================

func (r *pocketbaseRepository) GetAppSettingsMap() (map[string]string, error) {
	var list pbRecordList
	q := url.Values{}
	q.Set("perPage", "100")
	if err := r.pb.Get("/api/collections/app_settings/records", q, &list); err != nil {
		return nil, err
	}
	res := make(map[string]string)
	for _, item := range list.Items {
		k := getString(item, "key")
		v := getString(item, "value")
		if k != "" {
			res[k] = v
		}
	}
	return res, nil
}

func (r *pocketbaseRepository) UpdateAppSettings(body map[string]string) error {
	for k, v := range body {
		pbID := domain.UUIDToPbID(k)
		payload := map[string]interface{}{
			"key":   k,
			"value": v,
		}
		if err := r.pb.Patch(fmt.Sprintf("/api/collections/app_settings/records/%s", pbID), payload, nil); err != nil {
			payload["id"] = pbID
			payload["original_id"] = k
			_ = r.pb.Post("/api/collections/app_settings/records", payload, nil)
		}
	}
	return nil
}

// ==========================================
// Audit Logs Operations
// ==========================================

func (r *pocketbaseRepository) WriteAuditLog(log *models.AuditLog) error {
	details := map[string]interface{}{}
	if log.Details != "" {
		_ = json.Unmarshal([]byte(log.Details), &details)
	}
	payload := map[string]interface{}{
		"user_email":  log.UserEmail,
		"action":      log.Action,
		"entity_name": log.EntityName,
		"entity_id":   log.EntityID,
		"details":     details,
	}
	return r.pb.Post("/api/collections/audit_logs/records", payload, nil)
}

func (r *pocketbaseRepository) ListAuditLogs(limit, offset int) ([]models.AuditLog, int64, error) {
	var list pbRecordList
	page := 1
	if limit > 0 {
		page = (offset / limit) + 1
	}
	q := url.Values{}
	q.Set("page", strconv.Itoa(page))
	q.Set("perPage", strconv.Itoa(limit))
	q.Set("sort", "-id")
	if err := r.pb.Get("/api/collections/audit_logs/records", q, &list); err != nil {
		return nil, 0, err
	}

	res := make([]models.AuditLog, 0, len(list.Items))
	for _, item := range list.Items {
		detStr := "{}"
		if d, ok := item["details"]; ok && d != nil {
			if b, err := json.Marshal(d); err == nil {
				detStr = string(b)
			}
		}
		res = append(res, models.AuditLog{
			ID:         getString(item, "id"),
			UserEmail:  getString(item, "user_email"),
			Action:     getString(item, "action"),
			EntityName: getString(item, "entity_name"),
			EntityID:   getString(item, "entity_id"),
			Details:    detStr,
			CreatedAt:  parseTime(item["created"]),
		})
	}
	return res, list.TotalItems, nil
}

// ==========================================
// Auth User Operations
// ==========================================

func (r *pocketbaseRepository) GetAuthUserByEmail(email string) (*domain.AuthUserRecord, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(email))

	// 1. Check in users collection
	var list pbRecordList
	q := url.Values{}
	q.Set("filter", fmt.Sprintf("email='%s'", cleanEmail))
	q.Set("perPage", "1")
	if err := r.pb.Get("/api/collections/users/records", q, &list); err == nil && len(list.Items) > 0 {
		item := list.Items[0]
		return &domain.AuthUserRecord{
			ID:                getString(item, "id"),
			Email:             cleanEmail,
			EncryptedPassword: "",
			Role:              getString(item, "role"),
		}, nil
	}

	// 2. Check in _superusers
	if r.pb.AdminEmail != "" && strings.EqualFold(cleanEmail, r.pb.AdminEmail) {
		return &domain.AuthUserRecord{
			ID:                domain.UUIDToPbID(cleanEmail),
			Email:             cleanEmail,
			EncryptedPassword: "",
			Role:              "admin",
		}, nil
	}

	return nil, fmt.Errorf("user not found: %s", email)
}

func (r *pocketbaseRepository) UpdateAuthUserPassword(email string, newHashedPassword string) error {
	cleanEmail := strings.ToLower(strings.TrimSpace(email))
	var list pbRecordList
	q := url.Values{}
	q.Set("filter", fmt.Sprintf("email='%s'", cleanEmail))
	q.Set("perPage", "1")
	if err := r.pb.Get("/api/collections/users/records", q, &list); err == nil && len(list.Items) > 0 {
		pbID := getString(list.Items[0], "id")
		return r.pb.Patch(fmt.Sprintf("/api/collections/users/records/%s", pbID), map[string]interface{}{
			"password":        newHashedPassword,
			"passwordConfirm": newHashedPassword,
		}, nil)
	}
	return nil
}
