package repository

import (
	"fmt"
	"net/url"
	"time"

	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/models"

	"github.com/google/uuid"
)

func mapService(m map[string]interface{}) models.Service {
	idStr := getString(m, "id")
	origID := getString(m, "original_id")
	var uid uuid.UUID
	if origID != "" {
		uid = domain.PbIDToUUID(origID)
	} else {
		uid = domain.PbIDToUUID(idStr)
	}
	domain.RegisterIDMapping(idStr, uid)

	return models.Service{
		ID:          uid,
		Name:        getString(m, "name"),
		Slug:        getString(m, "slug"),
		Description: getString(m, "description"),
		IsActive:    getBool(m, "is_active"),
		SortOrder:   getInt(m, "sort_order"),
		CreatedAt:   parseTime(m["created"]),
		UpdatedAt:   parseTime(m["updated"]),
	}
}

func (r *pocketbaseRepository) ListActiveServices() ([]models.Service, error) {
	if cached, ok := r.getMemCache("active_services"); ok {
		return cached.([]models.Service), nil
	}
	var list pbRecordList
	q := url.Values{}
	q.Set("filter", "is_active=true")
	q.Set("sort", "sort_order")
	q.Set("perPage", "200")
	if err := r.pb.Get("/api/collections/services/records", q, &list); err != nil {
		return nil, err
	}
	res := make([]models.Service, 0, len(list.Items))
	for _, item := range list.Items {
		res = append(res, mapService(item))
	}
	r.setMemCache("active_services", res, 2*time.Minute)
	return res, nil
}

func (r *pocketbaseRepository) ListAllServicesAdmin() ([]models.Service, error) {
	var list pbRecordList
	q := url.Values{}
	q.Set("sort", "sort_order")
	q.Set("perPage", "200")
	if err := r.pb.Get("/api/collections/services/records", q, &list); err != nil {
		return nil, err
	}
	res := make([]models.Service, 0, len(list.Items))
	for _, item := range list.Items {
		res = append(res, mapService(item))
	}
	return res, nil
}

func (r *pocketbaseRepository) CreateService(service *models.Service) error {
	if service.ID == uuid.Nil {
		service.ID = uuid.New()
	}
	pbID := domain.UUIDToPbID(service.ID.String())
	domain.RegisterIDMapping(pbID, service.ID)

	payload := map[string]interface{}{
		"id":          pbID,
		"name":        service.Name,
		"slug":        service.Slug,
		"description": service.Description,
		"is_active":   service.IsActive,
		"sort_order":  service.SortOrder,
		"original_id": service.ID.String(),
	}
	if err := r.pb.Post("/api/collections/services/records", payload, nil); err != nil {
		return err
	}
	r.invalidateMemCache("active_services")
	return nil
}

func (r *pocketbaseRepository) UpdateService(id uuid.UUID, service *models.Service) (*models.Service, error) {
	pbID := domain.UUIDToPbID(id.String())
	payload := map[string]interface{}{
		"name":        service.Name,
		"slug":        service.Slug,
		"description": service.Description,
		"is_active":   service.IsActive,
		"sort_order":  service.SortOrder,
	}
	var updated map[string]interface{}
	if err := r.pb.Patch(fmt.Sprintf("/api/collections/services/records/%s", pbID), payload, &updated); err != nil {
		// Fallback patch by original_id
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/services/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			if patchErr := r.pb.Patch(fmt.Sprintf("/api/collections/services/records/%s", foundID), payload, &updated); patchErr != nil {
				return nil, patchErr
			}
		} else {
			return nil, err
		}
	}
	r.invalidateMemCache("active_services")
	res := mapService(updated)
	return &res, nil
}

func (r *pocketbaseRepository) DeleteService(id uuid.UUID) error {
	pbID := domain.UUIDToPbID(id.String())
	err := r.pb.Delete(fmt.Sprintf("/api/collections/services/records/%s", pbID))
	if err != nil {
		// Fallback: search by original_id or id
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/services/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			err = r.pb.Delete(fmt.Sprintf("/api/collections/services/records/%s", foundID))
		}
	}
	if err != nil {
		return err
	}
	r.invalidateMemCache("active_services")
	return nil
}

func mapCategory(m map[string]interface{}) models.ServiceCategory {
	idStr := getString(m, "id")
	origID := getString(m, "original_id")
	var uid uuid.UUID
	if origID != "" {
		uid = domain.PbIDToUUID(origID)
	} else {
		uid = domain.PbIDToUUID(idStr)
	}
	domain.RegisterIDMapping(idStr, uid)

	return models.ServiceCategory{
		ID:        uid,
		Name:      getString(m, "name"),
		SortOrder: getInt(m, "sort_order"),
		CreatedAt: parseTime(m["created"]),
	}
}

func (r *pocketbaseRepository) ListServiceCategories() ([]models.ServiceCategory, error) {
	var list pbRecordList
	q := url.Values{}
	q.Set("sort", "sort_order")
	q.Set("perPage", "100")
	if err := r.pb.Get("/api/collections/service_categories/records", q, &list); err != nil {
		return nil, err
	}
	res := make([]models.ServiceCategory, 0, len(list.Items))
	for _, item := range list.Items {
		res = append(res, mapCategory(item))
	}
	return res, nil
}

func (r *pocketbaseRepository) CreateServiceCategory(cat *models.ServiceCategory) error {
	if cat.ID == uuid.Nil {
		cat.ID = uuid.New()
	}
	pbID := domain.UUIDToPbID(cat.ID.String())
	domain.RegisterIDMapping(pbID, cat.ID)

	payload := map[string]interface{}{
		"id":          pbID,
		"name":        cat.Name,
		"sort_order":  cat.SortOrder,
		"original_id": cat.ID.String(),
	}
	return r.pb.Post("/api/collections/service_categories/records", payload, nil)
}

func (r *pocketbaseRepository) UpdateServiceCategory(id uuid.UUID, cat *models.ServiceCategory) (*models.ServiceCategory, error) {
	pbID := domain.UUIDToPbID(id.String())
	payload := map[string]interface{}{
		"name":       cat.Name,
		"sort_order": cat.SortOrder,
	}
	var updated map[string]interface{}
	if err := r.pb.Patch(fmt.Sprintf("/api/collections/service_categories/records/%s", pbID), payload, &updated); err != nil {
		// Fallback patch by original_id
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/service_categories/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			if patchErr := r.pb.Patch(fmt.Sprintf("/api/collections/service_categories/records/%s", foundID), payload, &updated); patchErr != nil {
				return nil, patchErr
			}
		} else {
			return nil, err
		}
	}
	res := mapCategory(updated)
	return &res, nil
}

func (r *pocketbaseRepository) DeleteServiceCategory(id uuid.UUID) error {
	pbID := domain.UUIDToPbID(id.String())
	err := r.pb.Delete(fmt.Sprintf("/api/collections/service_categories/records/%s", pbID))
	if err != nil {
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/service_categories/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			err = r.pb.Delete(fmt.Sprintf("/api/collections/service_categories/records/%s", foundID))
		}
	}
	return err
}
