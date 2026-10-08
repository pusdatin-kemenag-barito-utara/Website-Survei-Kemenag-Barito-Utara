package repository

import (
	"fmt"
	"net/url"
	"sync"
	"time"

	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/models"

	"github.com/google/uuid"
)

// ==========================================
// Unsur Operations
// ==========================================

func mapUnsur(m map[string]interface{}) models.Unsur {
	idStr := getString(m, "id")
	origID := getString(m, "original_id")
	var uid uuid.UUID
	if origID != "" {
		uid = domain.PbIDToUUID(origID)
	} else {
		uid = domain.PbIDToUUID(idStr)
	}
	domain.RegisterIDMapping(idStr, uid)

	return models.Unsur{
		ID:          uid,
		IndexType:   getString(m, "index_type"),
		Name:        getString(m, "name"),
		Description: getString(m, "description"),
		SortOrder:   getInt(m, "sort_order"),
		IsActive:    getBool(m, "is_active"),
		CreatedAt:   parseTime(m["created"]),
		UpdatedAt:   parseTime(m["updated"]),
	}
}

func (r *pocketbaseRepository) ListUnsur() ([]models.Unsur, error) {
	if cached, ok := r.getMemCache("list_unsur"); ok {
		return cached.([]models.Unsur), nil
	}
	var list pbRecordList
	q := url.Values{}
	q.Set("sort", "sort_order")
	q.Set("perPage", "100")
	if err := r.pb.Get("/api/collections/unsur/records", q, &list); err != nil {
		return nil, err
	}
	res := make([]models.Unsur, 0, len(list.Items))
	for _, item := range list.Items {
		res = append(res, mapUnsur(item))
	}
	r.setMemCache("list_unsur", res, 2*time.Minute)
	return res, nil
}

func (r *pocketbaseRepository) CreateUnsur(item *models.Unsur) error {
	if item.ID == uuid.Nil {
		item.ID = uuid.New()
	}
	pbID := domain.UUIDToPbID(item.ID.String())
	domain.RegisterIDMapping(pbID, item.ID)

	payload := map[string]interface{}{
		"id":          pbID,
		"index_type":  item.IndexType,
		"name":        item.Name,
		"description": item.Description,
		"sort_order":  item.SortOrder,
		"is_active":   item.IsActive,
		"original_id": item.ID.String(),
	}
	if err := r.pb.Post("/api/collections/unsur/records", payload, nil); err != nil {
		return err
	}
	r.invalidateMemCache("list_unsur")
	return nil
}

func (r *pocketbaseRepository) UpdateUnsur(id uuid.UUID, item *models.Unsur) (*models.Unsur, error) {
	pbID := domain.UUIDToPbID(id.String())
	payload := map[string]interface{}{
		"index_type":  item.IndexType,
		"name":        item.Name,
		"description": item.Description,
		"sort_order":  item.SortOrder,
		"is_active":   item.IsActive,
	}
	var updated map[string]interface{}
	if err := r.pb.Patch(fmt.Sprintf("/api/collections/unsur/records/%s", pbID), payload, &updated); err != nil {
		// Fallback patch by original_id
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/unsur/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			if patchErr := r.pb.Patch(fmt.Sprintf("/api/collections/unsur/records/%s", foundID), payload, &updated); patchErr != nil {
				return nil, patchErr
			}
		} else {
			return nil, err
		}
	}
	r.invalidateMemCache("list_unsur")
	res := mapUnsur(updated)
	return &res, nil
}

func (r *pocketbaseRepository) DeleteUnsur(id uuid.UUID) error {
	pbID := domain.UUIDToPbID(id.String())

	// 1. Delete all questions referencing this unsur first so foreign key constraints won't block deletion
	var qList pbRecordList
	qParams := url.Values{}
	qParams.Set("filter", fmt.Sprintf("unsur='%s'||unsur='%s'", pbID, id.String()))
	qParams.Set("perPage", "500")
	if err := r.pb.Get("/api/collections/questions/records", qParams, &qList); err == nil {
		for _, qItem := range qList.Items {
			if qID := getString(qItem, "id"); qID != "" {
				_ = r.pb.Delete(fmt.Sprintf("/api/collections/questions/records/%s", qID))
			}
		}
	}

	err := r.pb.Delete(fmt.Sprintf("/api/collections/unsur/records/%s", pbID))
	if err != nil {
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/unsur/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			err = r.pb.Delete(fmt.Sprintf("/api/collections/unsur/records/%s", foundID))
		}
	}
	if err != nil {
		return err
	}
	r.invalidateMemCache("list_unsur")
	r.invalidateMemCache("active_questions")
	r.invalidateMemCache("public_results")
	return nil
}

// ==========================================
// Questions Operations
// ==========================================

func mapQuestion(m map[string]interface{}) models.Question {
	idStr := getString(m, "id")
	origID := getString(m, "original_id")
	var uid uuid.UUID
	if origID != "" {
		uid = domain.PbIDToUUID(origID)
	} else {
		uid = domain.PbIDToUUID(idStr)
	}
	domain.RegisterIDMapping(idStr, uid)

	unsurIDStr := getString(m, "unsur")
	unsurUID := domain.PbIDToUUID(unsurIDStr)

	var sUID *uuid.UUID
	if servIDStr := getString(m, "service"); servIDStr != "" {
		parsed := domain.PbIDToUUID(servIDStr)
		sUID = &parsed
	}

	ratingLabels := make(map[string]string)
	if rlRaw, ok := m["rating_labels"]; ok && rlRaw != nil {
		if rMap, ok := rlRaw.(map[string]interface{}); ok {
			for k, v := range rMap {
				ratingLabels[k] = fmt.Sprintf("%v", v)
			}
		}
	}

	q := models.Question{
		ID:             uid,
		UnsurID:        unsurUID,
		ServiceID:      sUID,
		QuestionTextID: getString(m, "question_text_id"),
		QuestionTextEN: getString(m, "question_text_en"),
		InputType:      getString(m, "input_type"),
		RatingLabels:   ratingLabels,
		IsActive:       getBool(m, "is_active"),
		SortOrder:      getInt(m, "sort_order"),
		CreatedAt:      parseTime(m["created"]),
		UpdatedAt:      parseTime(m["updated"]),
	}

	if exp, ok := m["expand"].(map[string]interface{}); ok {
		if uExp, ok := exp["unsur"].(map[string]interface{}); ok {
			q.Unsur = mapUnsur(uExp)
			q.UnsurID = q.Unsur.ID
		}
	}

	return q
}

func (r *pocketbaseRepository) ListActiveQuestions() ([]models.Question, error) {
	if cached, ok := r.getMemCache("active_questions"); ok {
		if items, ok := cached.([]models.Question); ok && len(items) > 0 {
			return items, nil
		}
	}
	var list pbRecordList
	q := url.Values{}
	q.Set("filter", "is_active=true")
	q.Set("expand", "unsur")
	q.Set("sort", "sort_order")
	q.Set("perPage", "200")
	if err := r.pb.Get("/api/collections/questions/records", q, &list); err != nil {
		return nil, err
	}
	res := make([]models.Question, 0, len(list.Items))
	for _, item := range list.Items {
		res = append(res, mapQuestion(item))
	}
	if len(res) > 0 {
		r.setMemCache("active_questions", res, 2*time.Minute)
	}
	return res, nil
}

func (r *pocketbaseRepository) ListAllQuestions() ([]models.Question, error) {
	var list pbRecordList
	q := url.Values{}
	q.Set("expand", "unsur")
	q.Set("sort", "sort_order")
	q.Set("perPage", "200")
	if err := r.pb.Get("/api/collections/questions/records", q, &list); err != nil {
		return nil, err
	}
	res := make([]models.Question, 0, len(list.Items))
	for _, item := range list.Items {
		res = append(res, mapQuestion(item))
	}
	return res, nil
}

func (r *pocketbaseRepository) CreateQuestion(q *models.Question) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	pbID := domain.UUIDToPbID(q.ID.String())
	domain.RegisterIDMapping(pbID, q.ID)

	payload := map[string]interface{}{
		"id":               pbID,
		"unsur":            domain.UUIDToPbID(q.UnsurID.String()),
		"question_text_id": q.QuestionTextID,
		"question_text_en": q.QuestionTextEN,
		"input_type":       q.InputType,
		"rating_labels":    q.RatingLabels,
		"is_active":        q.IsActive,
		"sort_order":       q.SortOrder,
		"original_id":      q.ID.String(),
	}
	if q.ServiceID != nil {
		payload["service"] = domain.UUIDToPbID(q.ServiceID.String())
	}
	if err := r.pb.Post("/api/collections/questions/records", payload, nil); err != nil {
		return err
	}
	r.invalidateMemCache("active_questions")
	return nil
}

func (r *pocketbaseRepository) UpdateQuestion(id uuid.UUID, q *models.Question) (*models.Question, error) {
	pbID := domain.UUIDToPbID(id.String())
	payload := map[string]interface{}{
		"unsur":            domain.UUIDToPbID(q.UnsurID.String()),
		"question_text_id": q.QuestionTextID,
		"question_text_en": q.QuestionTextEN,
		"input_type":       q.InputType,
		"rating_labels":    q.RatingLabels,
		"is_active":        q.IsActive,
		"sort_order":       q.SortOrder,
	}
	if q.ServiceID != nil {
		payload["service"] = domain.UUIDToPbID(q.ServiceID.String())
	}
	var updated map[string]interface{}
	if err := r.pb.Patch(fmt.Sprintf("/api/collections/questions/records/%s", pbID), payload, &updated); err != nil {
		// Fallback patch by original_id
		var list pbRecordList
		qFilters := url.Values{}
		qFilters.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		qFilters.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/questions/records", qFilters, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			if patchErr := r.pb.Patch(fmt.Sprintf("/api/collections/questions/records/%s", foundID), payload, &updated); patchErr != nil {
				return nil, patchErr
			}
		} else {
			return nil, err
		}
	}
	r.invalidateMemCache("active_questions")
	res := mapQuestion(updated)
	return &res, nil
}

func (r *pocketbaseRepository) DeleteQuestion(id uuid.UUID) error {
	pbID := domain.UUIDToPbID(id.String())
	err := r.pb.Delete(fmt.Sprintf("/api/collections/questions/records/%s", pbID))
	if err != nil {
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/questions/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			err = r.pb.Delete(fmt.Sprintf("/api/collections/questions/records/%s", foundID))
		}
	}
	if err != nil {
		return err
	}
	r.invalidateMemCache("active_questions")
	return nil
}

// ==========================================
// Demographic Fields & Options
// ==========================================

func mapDemoOption(m map[string]interface{}) models.DemographicOption {
	idStr := getString(m, "id")
	origID := getString(m, "original_id")
	var uid uuid.UUID
	if origID != "" {
		uid = domain.PbIDToUUID(origID)
	} else {
		uid = domain.PbIDToUUID(idStr)
	}

	fieldIDStr := getString(m, "field")
	fieldUID := domain.PbIDToUUID(fieldIDStr)

	// If expand contains field, resolve original_id if present
	if exp, ok := m["expand"].(map[string]interface{}); ok {
		if fld, ok := exp["field"].(map[string]interface{}); ok {
			orig := getString(fld, "original_id")
			if orig != "" {
				fieldUID = domain.PbIDToUUID(orig)
			}
		}
	}

	return models.DemographicOption{
		ID:        uid,
		FieldID:   fieldUID,
		Value:     getString(m, "value"),
		LabelID:   getString(m, "label_id"),
		LabelEN:   getString(m, "label_en"),
		SortOrder: getInt(m, "sort_order"),
	}
}

func mapDemoField(m map[string]interface{}) models.DemographicField {
	idStr := getString(m, "id")
	origID := getString(m, "original_id")
	var uid uuid.UUID
	if origID != "" {
		uid = domain.PbIDToUUID(origID)
	} else {
		uid = domain.PbIDToUUID(idStr)
	}
	domain.RegisterIDMapping(idStr, uid)

	return models.DemographicField{
		ID:         uid,
		FieldKey:   getString(m, "field_key"),
		LabelID:    getString(m, "label_id"),
		LabelEN:    getString(m, "label_en"),
		FieldType:  getString(m, "field_type"),
		IsRequired: getBool(m, "is_required"),
		SortOrder:  getInt(m, "sort_order"),
		IsActive:   getBool(m, "is_active"),
		CreatedAt:  parseTime(m["created"]),
		UpdatedAt:  parseTime(m["updated"]),
	}
}

func (r *pocketbaseRepository) ListActiveDemographicFields() ([]models.DemographicField, error) {
	if cached, ok := r.getMemCache("active_demo_fields"); ok {
		return cached.([]models.DemographicField), nil
	}
	var fList pbRecordList
	var optList pbRecordList
	var errF, errOpt error

	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		q := url.Values{}
		q.Set("filter", "is_active=true")
		q.Set("sort", "sort_order")
		q.Set("perPage", "100")
		errF = r.pb.Get("/api/collections/demographic_fields/records", q, &fList)
	}()

	go func() {
		defer wg.Done()
		q := url.Values{}
		q.Set("sort", "sort_order")
		q.Set("perPage", "500")
		errOpt = r.pb.Get("/api/collections/demographic_options/records", q, &optList)
	}()

	wg.Wait()

	if errF != nil {
		return nil, errF
	}

	optsByPbID := make(map[string][]models.DemographicOption)
	if errOpt == nil {
		for _, optItem := range optList.Items {
			pbFieldID := getString(optItem, "field")
			opt := mapDemoOption(optItem)
			optsByPbID[pbFieldID] = append(optsByPbID[pbFieldID], opt)
		}
	}

	res := make([]models.DemographicField, 0, len(fList.Items))
	for _, item := range fList.Items {
		f := mapDemoField(item)
		pbID := getString(item, "id")
		rawOpts := optsByPbID[pbID]
		opts := make([]models.DemographicOption, len(rawOpts))
		copy(opts, rawOpts)
		for i := range opts {
			opts[i].FieldID = f.ID
		}
		f.Options = opts
		f.DemographicOptions = opts
		res = append(res, f)
	}
	r.setMemCache("active_demo_fields", res, 2*time.Minute)
	return res, nil
}

func (r *pocketbaseRepository) ListAllDemographicFieldsAdmin() ([]models.DemographicField, error) {
	var fList pbRecordList
	var optList pbRecordList
	var errF, errOpt error

	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		q := url.Values{}
		q.Set("sort", "sort_order")
		q.Set("perPage", "100")
		errF = r.pb.Get("/api/collections/demographic_fields/records", q, &fList)
	}()

	go func() {
		defer wg.Done()
		q := url.Values{}
		q.Set("sort", "sort_order")
		q.Set("perPage", "500")
		errOpt = r.pb.Get("/api/collections/demographic_options/records", q, &optList)
	}()

	wg.Wait()

	if errF != nil {
		return nil, errF
	}

	optsByPbID := make(map[string][]models.DemographicOption)
	if errOpt == nil {
		for _, optItem := range optList.Items {
			pbFieldID := getString(optItem, "field")
			opt := mapDemoOption(optItem)
			optsByPbID[pbFieldID] = append(optsByPbID[pbFieldID], opt)
		}
	}

	res := make([]models.DemographicField, 0, len(fList.Items))
	for _, item := range fList.Items {
		f := mapDemoField(item)
		pbID := getString(item, "id")
		rawOpts := optsByPbID[pbID]
		opts := make([]models.DemographicOption, len(rawOpts))
		copy(opts, rawOpts)
		for i := range opts {
			opts[i].FieldID = f.ID
		}
		f.Options = opts
		f.DemographicOptions = opts
		res = append(res, f)
	}
	return res, nil
}

func (r *pocketbaseRepository) CreateDemographicField(field *models.DemographicField) error {
	if field.ID == uuid.Nil {
		field.ID = uuid.New()
	}
	pbID := domain.UUIDToPbID(field.ID.String())
	domain.RegisterIDMapping(pbID, field.ID)

	payload := map[string]interface{}{
		"id":          pbID,
		"field_key":   field.FieldKey,
		"label_id":    field.LabelID,
		"label_en":    field.LabelEN,
		"field_type":  field.FieldType,
		"is_required": field.IsRequired,
		"sort_order":  field.SortOrder,
		"is_active":   field.IsActive,
		"original_id": field.ID.String(),
	}
	err := r.pb.Post("/api/collections/demographic_fields/records", payload, nil)
	if err == nil {
		r.invalidateMemCache("active_demo_fields")
	}
	return err
}

func (r *pocketbaseRepository) UpdateDemographicField(id uuid.UUID, field *models.DemographicField) (*models.DemographicField, error) {
	pbID := domain.UUIDToPbID(id.String())
	payload := map[string]interface{}{
		"field_key":   field.FieldKey,
		"label_id":    field.LabelID,
		"label_en":    field.LabelEN,
		"field_type":  field.FieldType,
		"is_required": field.IsRequired,
		"sort_order":  field.SortOrder,
		"is_active":   field.IsActive,
	}
	var updated map[string]interface{}
	if err := r.pb.Patch(fmt.Sprintf("/api/collections/demographic_fields/records/%s", pbID), payload, &updated); err != nil {
		// Fallback patch by original_id
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/demographic_fields/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			if patchErr := r.pb.Patch(fmt.Sprintf("/api/collections/demographic_fields/records/%s", foundID), payload, &updated); patchErr != nil {
				return nil, patchErr
			}
		} else {
			return nil, err
		}
	}
	r.invalidateMemCache("active_demo_fields")
	res := mapDemoField(updated)
	return &res, nil
}

func (r *pocketbaseRepository) DeleteDemographicField(id uuid.UUID) error {
	pbID := domain.UUIDToPbID(id.String())

	// 1. Delete associated options first
	var optList pbRecordList
	qOpts := url.Values{}
	qOpts.Set("filter", fmt.Sprintf("field='%s'", pbID))
	qOpts.Set("perPage", "500")
	if err := r.pb.Get("/api/collections/demographic_options/records", qOpts, &optList); err == nil {
		for _, o := range optList.Items {
			if oID := getString(o, "id"); oID != "" {
				_ = r.pb.Delete(fmt.Sprintf("/api/collections/demographic_options/records/%s", oID))
			}
		}
	}

	err := r.pb.Delete(fmt.Sprintf("/api/collections/demographic_fields/records/%s", pbID))
	if err != nil {
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/demographic_fields/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			err = r.pb.Delete(fmt.Sprintf("/api/collections/demographic_fields/records/%s", foundID))
		}
	}
	if err == nil {
		r.invalidateMemCache("active_demo_fields")
	}
	return err
}

func (r *pocketbaseRepository) ListDemographicOptionsByField(fieldID uuid.UUID) ([]models.DemographicOption, error) {
	pbFieldID := domain.UUIDToPbID(fieldID.String())
	var list pbRecordList
	q := url.Values{}
	q.Set("filter", fmt.Sprintf("field='%s'", pbFieldID))
	q.Set("sort", "sort_order")
	q.Set("perPage", "100")
	if err := r.pb.Get("/api/collections/demographic_options/records", q, &list); err != nil {
		return nil, err
	}
	res := make([]models.DemographicOption, 0, len(list.Items))
	for _, item := range list.Items {
		opt := mapDemoOption(item)
		opt.FieldID = fieldID
		res = append(res, opt)
	}
	return res, nil
}

func (r *pocketbaseRepository) CreateDemographicOption(opt *models.DemographicOption) error {
	if opt.ID == uuid.Nil {
		opt.ID = uuid.New()
	}
	pbID := domain.UUIDToPbID(opt.ID.String())
	domain.RegisterIDMapping(pbID, opt.ID)

	payload := map[string]interface{}{
		"id":          pbID,
		"field":       domain.UUIDToPbID(opt.FieldID.String()),
		"value":       opt.Value,
		"label_id":    opt.LabelID,
		"label_en":    opt.LabelEN,
		"sort_order":  opt.SortOrder,
		"original_id": opt.ID.String(),
	}
	err := r.pb.Post("/api/collections/demographic_options/records", payload, nil)
	if err == nil {
		r.invalidateMemCache("active_demo_fields")
	}
	return err
}

func (r *pocketbaseRepository) UpdateDemographicOption(id uuid.UUID, opt *models.DemographicOption) (*models.DemographicOption, error) {
	pbID := domain.UUIDToPbID(id.String())
	payload := map[string]interface{}{
		"value":      opt.Value,
		"label_id":   opt.LabelID,
		"label_en":   opt.LabelEN,
		"sort_order": opt.SortOrder,
	}
	if opt.FieldID != uuid.Nil {
		payload["field"] = domain.UUIDToPbID(opt.FieldID.String())
	}
	var updated map[string]interface{}
	if err := r.pb.Patch(fmt.Sprintf("/api/collections/demographic_options/records/%s", pbID), payload, &updated); err != nil {
		// Fallback patch by original_id
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/demographic_options/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			if patchErr := r.pb.Patch(fmt.Sprintf("/api/collections/demographic_options/records/%s", foundID), payload, &updated); patchErr != nil {
				return nil, patchErr
			}
		} else {
			return nil, err
		}
	}
	r.invalidateMemCache("active_demo_fields")
	res := mapDemoOption(updated)
	if opt.FieldID != uuid.Nil {
		res.FieldID = opt.FieldID
	}
	return &res, nil
}

func (r *pocketbaseRepository) DeleteDemographicOption(id uuid.UUID) error {
	pbID := domain.UUIDToPbID(id.String())
	err := r.pb.Delete(fmt.Sprintf("/api/collections/demographic_options/records/%s", pbID))
	if err != nil {
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/demographic_options/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			err = r.pb.Delete(fmt.Sprintf("/api/collections/demographic_options/records/%s", foundID))
		}
	}
	if err == nil {
		r.invalidateMemCache("active_demo_fields")
	}
	return err
}
