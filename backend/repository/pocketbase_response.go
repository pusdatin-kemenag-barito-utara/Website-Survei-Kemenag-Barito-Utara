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

// ListResponsesPaginated lists responses with search, date, service, period filters
func (r *pocketbaseRepository) ListResponsesPaginated(serviceID, periodID, dateFrom, dateTo, search string, limit, offset int) ([]models.Response, int64, error) {
	filters := make([]string, 0)
	if serviceID != "" {
		pbSID := domain.UUIDToPbID(serviceID)
		filters = append(filters, fmt.Sprintf("service='%s'", pbSID))
	}
	if periodID != "" {
		pbPID := domain.UUIDToPbID(periodID)
		filters = append(filters, fmt.Sprintf("period='%s'", pbPID))
	}
	if search != "" {
		filters = append(filters, fmt.Sprintf("(respondent_name~'%s'||respondent_contact~'%s')", search, search))
	}

	page := 1
	if limit > 0 {
		page = (offset / limit) + 1
	}

	q := url.Values{}
	q.Set("page", strconv.Itoa(page))
	q.Set("perPage", strconv.Itoa(limit))
	q.Set("sort", "-submitted_at")
	if len(filters) > 0 {
		q.Set("filter", strings.Join(filters, "&&"))
	}

	var list pbRecordList
	if err := r.pb.Get("/api/collections/responses/records", q, &list); err != nil {
		return nil, 0, err
	}

	services, _ := r.ListAllServicesAdmin()
	servMap := make(map[string]models.Service)
	for _, s := range services {
		servMap[domain.UUIDToPbID(s.ID.String())] = s
	}

	periods, _ := r.ListPeriods()
	periodMap := make(map[string]models.SurveyPeriod)
	for _, p := range periods {
		periodMap[domain.UUIDToPbID(p.ID.String())] = p
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

		sPbID := getString(item, "service")
		pPbID := getString(item, "period")

		resp := models.Response{
			ID:                uid,
			ServiceID:         domain.PbIDToUUID(sPbID),
			PeriodID:          domain.PbIDToUUID(pPbID),
			IsAnonymous:       getBool(item, "is_anonymous"),
			RespondentName:    getString(item, "respondent_name"),
			RespondentContact: getString(item, "respondent_contact"),
			Locale:            getString(item, "locale"),
			TurnstileVerified: getBool(item, "turnstile_verified"),
			IPKPFeedback:      getString(item, "ipkp_feedback"),
			IPAKFeedback:      getString(item, "ipak_feedback"),
			IPAddress:         getString(item, "ip_address"),
			SubmittedAt:       parseTime(item["submitted_at"]),
			Service:           servMap[sPbID],
			Period:            periodMap[pPbID],
		}
		res = append(res, resp)
	}

	return res, list.TotalItems, nil
}

func (r *pocketbaseRepository) DeleteResponseFull(id uuid.UUID) error {
	pbID := domain.UUIDToPbID(id.String())
	err := r.pb.Delete(fmt.Sprintf("/api/collections/responses/records/%s", pbID))
	if err != nil {
		var list pbRecordList
		q := url.Values{}
		q.Set("filter", fmt.Sprintf("original_id='%s'||id='%s'", id.String(), pbID))
		q.Set("perPage", "1")
		if findErr := r.pb.Get("/api/collections/responses/records", q, &list); findErr == nil && len(list.Items) > 0 {
			foundID := getString(list.Items[0], "id")
			err = r.pb.Delete(fmt.Sprintf("/api/collections/responses/records/%s", foundID))
		}
	}
	if err == nil {
		r.invalidateMemCache("all_")
		r.invalidateMemCache("public_results_")
		r.invalidateMemCache("admin_stats_")
	}
	return err
}

func (r *pocketbaseRepository) GetResponseAnswersDetail(id uuid.UUID) ([]domain.AnswerDetailResult, error) {
	pbID := domain.UUIDToPbID(id.String())
	var ansList pbRecordList
	q := url.Values{}
	q.Set("filter", fmt.Sprintf("response='%s'", pbID))
	q.Set("expand", "question,unsur")
	q.Set("perPage", "100")
	if err := r.pb.Get("/api/collections/response_answers/records", q, &ansList); err != nil {
		return nil, err
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
	q.Set("filter", fmt.Sprintf("response='%s'", pbID))
	q.Set("expand", "field")
	q.Set("perPage", "100")
	if err := r.pb.Get("/api/collections/response_demographics/records", q, &demoList); err != nil {
		return nil, err
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
	r.invalidateMemCache("public_results_")
	r.invalidateMemCache("admin_stats_")
	return nil
}
