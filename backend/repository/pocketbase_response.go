package repository

import (
	"fmt"
	"log"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/models"

	"github.com/google/uuid"
)

type paginatedRespCache struct {
	items []models.Response
	total int64
}

// ListResponsesPaginated lists responses with search, date, service, period filters
func (r *pocketbaseRepository) ListResponsesPaginated(serviceID, periodID, dateFrom, dateTo, search string, limit, offset int) ([]models.Response, int64, error) {
	cacheKey := fmt.Sprintf("responses_list_%s_%s_%s_%s_%s_%d_%d", serviceID, periodID, dateFrom, dateTo, search, limit, offset)
	if cached, ok := r.getMemCache(cacheKey); ok {
		if cVal, ok := cached.(paginatedRespCache); ok {
			return cVal.items, cVal.total, nil
		}
	}

	filters := make([]string, 0)
	if serviceID != "" {
		pbSID := domain.UUIDToPbID(serviceID)
		if pbSID != "" && pbSID != serviceID {
			filters = append(filters, fmt.Sprintf("(service='%s' || service='%s' || service.original_id='%s')", pbSID, serviceID, serviceID))
		} else if pbSID != "" {
			filters = append(filters, fmt.Sprintf("(service='%s' || service.original_id='%s')", pbSID, serviceID))
		}
	}
	if periodID != "" {
		pbPID := domain.UUIDToPbID(periodID)
		if pbPID != "" && pbPID != periodID {
			filters = append(filters, fmt.Sprintf("(period='%s' || period='%s' || period.original_id='%s')", pbPID, periodID, periodID))
		} else if pbPID != "" {
			filters = append(filters, fmt.Sprintf("(period='%s' || period.original_id='%s')", pbPID, periodID))
		}
	}
	if dateFrom != "" {
		cleanFrom := strings.TrimSpace(dateFrom)
		filters = append(filters, fmt.Sprintf("submitted_at >= '%s'", cleanFrom))
	}
	if dateTo != "" {
		cleanTo := strings.TrimSpace(dateTo)
		if endParsed, err := time.Parse("2006-01-02", cleanTo); err == nil {
			nextDay := endParsed.AddDate(0, 0, 1).Format("2006-01-02")
			filters = append(filters, fmt.Sprintf("submitted_at < '%s'", nextDay))
		} else {
			filters = append(filters, fmt.Sprintf("submitted_at <= '%sT23:59:59.999Z'", cleanTo))
		}
	}
	if search != "" {
		cleanSearch := strings.ReplaceAll(strings.TrimSpace(search), "'", "\\'")
		filters = append(filters, fmt.Sprintf("(respondent_name ~ '%s' || respondent_contact ~ '%s')", cleanSearch, cleanSearch))
	}

	page := 1
	if limit > 0 {
		page = (offset / limit) + 1
	}

	q := url.Values{}
	q.Set("page", strconv.Itoa(page))
	q.Set("perPage", strconv.Itoa(limit))
	q.Set("sort", "-submitted_at")
	q.Set("expand", "service,period")
	q.Set("fields", "id,original_id,service,period,is_anonymous,respondent_name,respondent_contact,locale,turnstile_verified,ip_address,submitted_at,created,expand.service.id,expand.service.name,expand.service.slug,expand.service.original_id,expand.period.id,expand.period.label,expand.period.original_id,expand.period.is_active")
	if len(filters) > 0 {
		q.Set("filter", strings.Join(filters, " && "))
	}

	var list pbRecordList
	if err := r.pb.Get("/api/collections/responses/records", q, &list); err != nil {
		return nil, 0, err
	}

	res := make([]models.Response, 0, len(list.Items))
	for _, item := range list.Items {
		idStr := getString(item, "id")
		origID := getString(item, "original_id")
		var uid uuid.UUID
		if origID != "" {
			uid = domain.PbIDToUUID(origID)
		} else {
			uid = domain.PbIDToUUID(idStr)
		}
		if idStr != "" && uid != uuid.Nil {
			domain.RegisterIDMapping(idStr, uid)
		}

		var sModel models.Service
		var pModel models.SurveyPeriod
		if exp, ok := item["expand"].(map[string]interface{}); ok {
			if sObj, ok := exp["service"].(map[string]interface{}); ok {
				sModel = mapService(sObj)
			}
			if pObj, ok := exp["period"].(map[string]interface{}); ok {
				pModel = mapPeriod(pObj)
			}
		}

		sPbID := getString(item, "service")
		pPbID := getString(item, "period")

		sID := sModel.ID
		if sID == uuid.Nil && sPbID != "" {
			sID = domain.PbIDToUUID(sPbID)
		}

		pID := pModel.ID
		if pID == uuid.Nil && pPbID != "" {
			pID = domain.PbIDToUUID(pPbID)
		}

		resp := models.Response{
			ID:                uid,
			ServiceID:         sID,
			PeriodID:          pID,
			IsAnonymous:       getBool(item, "is_anonymous"),
			RespondentName:    getString(item, "respondent_name"),
			RespondentContact: getString(item, "respondent_contact"),
			Locale:            getString(item, "locale"),
			TurnstileVerified: getBool(item, "turnstile_verified"),
			IPKPFeedback:      getString(item, "ipkp_feedback"),
			IPAKFeedback:      getString(item, "ipak_feedback"),
			IPAddress:         getString(item, "ip_address"),
			SubmittedAt:       parseTime(item["submitted_at"]),
			Service:           sModel,
			Period:            pModel,
		}
		res = append(res, resp)
	}

	r.setMemCache(cacheKey, paginatedRespCache{items: res, total: list.TotalItems}, 15*time.Second)
	return res, list.TotalItems, nil
}

func (r *pocketbaseRepository) DeleteResponseFull(id uuid.UUID) error {
	pbID := domain.UUIDToPbID(id.String())
	filterStr := fmt.Sprintf("(response='%s' || response='%s')", pbID, id.String())

	// Step 1: Fetch child IDs in parallel with minimal payload (fields=id)
	var ansList, demoList pbRecordList
	var fetchWg sync.WaitGroup
	fetchWg.Add(2)

	go func() {
		defer fetchWg.Done()
		qAns := url.Values{}
		qAns.Set("filter", filterStr)
		qAns.Set("fields", "id")
		qAns.Set("perPage", "500")
		_ = r.pb.Get("/api/collections/response_answers/records", qAns, &ansList)
	}()

	go func() {
		defer fetchWg.Done()
		qDemo := url.Values{}
		qDemo.Set("filter", filterStr)
		qDemo.Set("fields", "id")
		qDemo.Set("perPage", "500")
		_ = r.pb.Get("/api/collections/response_demographics/records", qDemo, &demoList)
	}()

	fetchWg.Wait()

	// Step 2: Concurrently delete all child records & the parent response record
	var delWg sync.WaitGroup
	for _, a := range ansList.Items {
		if aID := getString(a, "id"); aID != "" {
			delWg.Add(1)
			go func(recID string) {
				defer delWg.Done()
				_ = r.pb.Delete(fmt.Sprintf("/api/collections/response_answers/records/%s", recID))
			}(aID)
		}
	}

	for _, d := range demoList.Items {
		if dID := getString(d, "id"); dID != "" {
			delWg.Add(1)
			go func(recID string) {
				defer delWg.Done()
				_ = r.pb.Delete(fmt.Sprintf("/api/collections/response_demographics/records/%s", recID))
			}(dID)
		}
	}

	// Delete main response record
	var mainErr error
	delWg.Add(1)
	go func() {
		defer delWg.Done()
		mainErr = r.pb.Delete(fmt.Sprintf("/api/collections/responses/records/%s", pbID))
		if mainErr != nil {
			var list pbRecordList
			q := url.Values{}
			q.Set("filter", fmt.Sprintf("(original_id='%s' || id='%s')", id.String(), pbID))
			q.Set("fields", "id")
			q.Set("perPage", "1")
			if findErr := r.pb.Get("/api/collections/responses/records", q, &list); findErr == nil && len(list.Items) > 0 {
				foundID := getString(list.Items[0], "id")
				mainErr = r.pb.Delete(fmt.Sprintf("/api/collections/responses/records/%s", foundID))
			}
		}
	}()

	delWg.Wait()

	if mainErr == nil {
		r.invalidateMemCache("all_")
		r.invalidateMemCache("responses_list_")
		r.invalidateMemCache("public_results_")
		r.invalidateMemCache("admin_stats_")
	}
	return mainErr
}

func (r *pocketbaseRepository) GetResponseAnswersDetail(id uuid.UUID) ([]domain.AnswerDetailResult, error) {
	pbID := domain.UUIDToPbID(id.String())
	var ansList pbRecordList
	q := url.Values{}
	q.Set("filter", fmt.Sprintf("(response='%s' || response='%s')", pbID, id.String()))
	q.Set("expand", "question,unsur")
	q.Set("perPage", "100")
	if err := r.pb.Get("/api/collections/response_answers/records", q, &ansList); err != nil {
		return nil, err
	}

	// Fallback check if pbID differed from PocketBase record ID
	if len(ansList.Items) == 0 {
		var respList pbRecordList
		qResp := url.Values{}
		qResp.Set("filter", fmt.Sprintf("(original_id='%s' || id='%s')", id.String(), pbID))
		qResp.Set("perPage", "1")
		if err := r.pb.Get("/api/collections/responses/records", qResp, &respList); err == nil && len(respList.Items) > 0 {
			realPbID := getString(respList.Items[0], "id")
			domain.RegisterIDMapping(realPbID, id)
			q2 := url.Values{}
			q2.Set("filter", fmt.Sprintf("response='%s'", realPbID))
			q2.Set("expand", "question,unsur")
			q2.Set("perPage", "100")
			_ = r.pb.Get("/api/collections/response_answers/records", q2, &ansList)
		}
	}

	res := make([]domain.AnswerDetailResult, 0, len(ansList.Items))
	for _, item := range ansList.Items {
		row := domain.AnswerDetailResult{
			ID:          domain.PbIDToUUID(getString(item, "id")),
			RatingValue: getInt(item, "rating_value"),
		}
		if exp, ok := item["expand"].(map[string]interface{}); ok {
			if qObj, ok := exp["question"].(map[string]interface{}); ok {
				row.QuestionTextID = getString(qObj, "question_text_id")
				row.QuestionTextEN = getString(qObj, "question_text_en")
			}
			if uObj, ok := exp["unsur"].(map[string]interface{}); ok {
				row.UnsurName = getString(uObj, "name")
				row.IndexType = getString(uObj, "index_type")
			}
		}
		res = append(res, row)
	}
	return res, nil
}

func (r *pocketbaseRepository) GetResponseDemographicsDetail(id uuid.UUID) ([]domain.DemoDetailResult, error) {
	pbID := domain.UUIDToPbID(id.String())
	var demoList pbRecordList
	q := url.Values{}
	q.Set("filter", fmt.Sprintf("response='%s'||response='%s'", pbID, id.String()))
	q.Set("expand", "field")
	q.Set("perPage", "100")
	if err := r.pb.Get("/api/collections/response_demographics/records", q, &demoList); err != nil {
		return nil, err
	}

	// Fallback check if pbID differed from PocketBase record ID
	if len(demoList.Items) == 0 {
		var respList pbRecordList
		qResp := url.Values{}
		qResp.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		qResp.Set("perPage", "1")
		if err := r.pb.Get("/api/collections/responses/records", qResp, &respList); err == nil && len(respList.Items) > 0 {
			realPbID := getString(respList.Items[0], "id")
			domain.RegisterIDMapping(realPbID, id)
			q2 := url.Values{}
			q2.Set("filter", fmt.Sprintf("response='%s'", realPbID))
			q2.Set("expand", "field")
			q2.Set("perPage", "100")
			_ = r.pb.Get("/api/collections/response_demographics/records", q2, &demoList)
		}
	}

	res := make([]domain.DemoDetailResult, 0, len(demoList.Items))
	for _, item := range demoList.Items {
		row := domain.DemoDetailResult{
			ID:    domain.PbIDToUUID(getString(item, "id")),
			Value: getString(item, "value"),
		}
		if exp, ok := item["expand"].(map[string]interface{}); ok {
			if fObj, ok := exp["field"].(map[string]interface{}); ok {
				row.FieldKey = getString(fObj, "field_key")
				row.LabelID = getString(fObj, "label_id")
				row.LabelEN = getString(fObj, "label_en")
			}
		}
		res = append(res, row)
	}
	return res, nil
}

func (r *pocketbaseRepository) VerifyPassword(email, rawPassword string) bool {
	cleanEmail := strings.ToLower(strings.TrimSpace(email))
	if ok, _, _ := r.pb.AuthWithPassword("users", cleanEmail, rawPassword); ok {
		return true
	}
	if ok, _, _ := r.pb.AuthWithPassword("_superusers", cleanEmail, rawPassword); ok {
		return true
	}
	return false
}

func (r *pocketbaseRepository) SaveResponseFull(resp *models.Response, demoList []models.ResponseDemographic, answerList []models.ResponseAnswer) error {
	pbRespID := domain.UUIDToPbID(resp.ID.String())
	if pbRespID == "" || len(pbRespID) != 15 {
		pbRespID = domain.UUIDToPbID(uuid.New().String())
		resp.ID = domain.PbIDToUUID(pbRespID)
	}

	submittedAtStr := resp.SubmittedAt.Format(time.RFC3339)
	payload := map[string]interface{}{
		"id":                 pbRespID,
		"service":            domain.UUIDToPbID(resp.ServiceID.String()),
		"period":             domain.UUIDToPbID(resp.PeriodID.String()),
		"is_anonymous":       resp.IsAnonymous,
		"respondent_name":    resp.RespondentName,
		"respondent_contact": resp.RespondentContact,
		"locale":             resp.Locale,
		"turnstile_verified": resp.TurnstileVerified,
		"ipkp_feedback":      resp.IPKPFeedback,
		"ipak_feedback":      resp.IPAKFeedback,
		"ip_address":         resp.IPAddress,
		"submitted_at":       submittedAtStr,
		"original_id":        resp.ID.String(),
	}

	if err := r.pb.Post("/api/collections/responses/records", payload, nil); err != nil {
		return err
	}

	// Insert demographics and answers concurrently to eliminate WAN latency
	var wg sync.WaitGroup

	for _, d := range demoList {
		item := d
		wg.Add(1)
		go func() {
			defer wg.Done()
			dPbID := domain.UUIDToPbID(uuid.New().String())
			dPayload := map[string]interface{}{
				"id":          dPbID,
				"response":    pbRespID,
				"field":       domain.UUIDToPbID(item.FieldID.String()),
				"value":       item.Value,
				"original_id": item.ID.String(),
			}
			if err := r.pb.Post("/api/collections/response_demographics/records", dPayload, nil); err != nil {
				log.Printf("[PocketBase] Error inserting response demographic: %v", err)
			}
		}()
	}

	for _, a := range answerList {
		item := a
		wg.Add(1)
		go func() {
			defer wg.Done()
			aPbID := domain.UUIDToPbID(uuid.New().String())
			aPayload := map[string]interface{}{
				"id":           aPbID,
				"response":     pbRespID,
				"question":     domain.UUIDToPbID(item.QuestionID.String()),
				"unsur":        domain.UUIDToPbID(item.UnsurID.String()),
				"rating_value": item.RatingValue,
				"original_id":  item.ID.String(),
			}
			if err := r.pb.Post("/api/collections/response_answers/records", aPayload, nil); err != nil {
				log.Printf("[PocketBase] Error inserting response answer: %v", err)
			}
		}()
	}

	wg.Wait()

	r.invalidateMemCache("all_")
	r.invalidateMemCache("responses_list_")
	r.invalidateMemCache("public_results_")
	r.invalidateMemCache("admin_stats_")
	return nil
}
