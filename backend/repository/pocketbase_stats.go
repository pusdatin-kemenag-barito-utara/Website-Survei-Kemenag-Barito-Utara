package repository

import (
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/models"

	"github.com/google/uuid"
)

// ==========================================
// Response & Calculation Stats Operations
// ==========================================

func (r *pocketbaseRepository) CountTotalResponses() (int64, error) {
	var list pbRecordList
	q := url.Values{}
	q.Set("perPage", "1")
	if err := r.pb.Get("/api/collections/responses/records", q, &list); err != nil {
		return 0, err
	}
	return list.TotalItems, nil
}

func (r *pocketbaseRepository) CountActiveServices() (int64, error) {
	var list pbRecordList
	q := url.Values{}
	q.Set("filter", "is_active=true")
	q.Set("perPage", "1")
	if err := r.pb.Get("/api/collections/services/records", q, &list); err != nil {
		return 0, err
	}
	return list.TotalItems, nil
}

func (r *pocketbaseRepository) CountActiveUnsur() (int64, error) {
	var list pbRecordList
	q := url.Values{}
	q.Set("filter", "is_active=true")
	q.Set("perPage", "1")
	if err := r.pb.Get("/api/collections/unsur/records", q, &list); err != nil {
		return 0, err
	}
	return list.TotalItems, nil
}

func (r *pocketbaseRepository) GetAnswerUnsurRawList() ([]domain.AnswerUnsurRaw, error) {
	var ansList pbRecordList
	q := url.Values{}
	q.Set("expand", "unsur")
	q.Set("perPage", "5000")
	if err := r.pb.Get("/api/collections/response_answers/records", q, &ansList); err != nil {
		return nil, err
	}

	res := make([]domain.AnswerUnsurRaw, 0, len(ansList.Items))
	for _, item := range ansList.Items {
		ratingVal := getInt(item, "rating_value")
		indexType := "IPKP"
		if exp, ok := item["expand"].(map[string]interface{}); ok {
			if u, ok := exp["unsur"].(map[string]interface{}); ok {
				indexType = getString(u, "index_type")
			}
		}
		res = append(res, domain.AnswerUnsurRaw{
			RatingValue: ratingVal,
			IndexType:   indexType,
		})
	}
	return res, nil
}

func (r *pocketbaseRepository) GetUnsurAvgRating(unsurID uuid.UUID) (float64, error) {
	pbUnsurID := domain.UUIDToPbID(unsurID.String())
	var ansList pbRecordList
	q := url.Values{}
	q.Set("filter", fmt.Sprintf("unsur='%s'", pbUnsurID))
	q.Set("perPage", "5000")
	if err := r.pb.Get("/api/collections/response_answers/records", q, &ansList); err != nil {
		return 0, err
	}
	if len(ansList.Items) == 0 {
		return 0, nil
	}
	sum := 0.0
	for _, a := range ansList.Items {
		sum += float64(getInt(a, "rating_value"))
	}
	return sum / float64(len(ansList.Items)), nil
}

func (r *pocketbaseRepository) GetServiceResponseCount(serviceID uuid.UUID) (int64, error) {
	pbServiceID := domain.UUIDToPbID(serviceID.String())
	var list pbRecordList
	q := url.Values{}
	q.Set("filter", fmt.Sprintf("service='%s'", pbServiceID))
	q.Set("perPage", "1")
	if err := r.pb.Get("/api/collections/responses/records", q, &list); err != nil {
		return 0, err
	}
	return list.TotalItems, nil
}

func (r *pocketbaseRepository) GetServiceAvgRating(serviceID uuid.UUID, indexType string) (float64, error) {
	pbServiceID := domain.UUIDToPbID(serviceID.String())
	var respList pbRecordList
	q := url.Values{}
	q.Set("filter", fmt.Sprintf("service='%s'", pbServiceID))
	q.Set("perPage", "2000")
	if err := r.pb.Get("/api/collections/responses/records", q, &respList); err != nil || len(respList.Items) == 0 {
		return 0, nil
	}
	respIDs := make(map[string]bool)
	for _, rItem := range respList.Items {
		respIDs[getString(rItem, "id")] = true
	}

	answers, err := r.getAllAnswers()
	if err != nil {
		return 0, err
	}
	sum := 0.0
	count := 0.0
	for _, a := range answers {
		rID := getString(a, "response")
		if respIDs[rID] {
			if exp, ok := a["expand"].(map[string]interface{}); ok {
				if u, ok := exp["unsur"].(map[string]interface{}); ok {
					if getString(u, "index_type") == indexType {
						sum += float64(getInt(a, "rating_value"))
						count++
					}
				}
			}
		}
	}
	if count > 0 {
		return sum / count, nil
	}
	return 0, nil
}

func cleanDateOnly(d string) string {
	d = strings.TrimSpace(d)
	if len(d) >= 10 {
		return d[:10]
	}
	return d
}

func (r *pocketbaseRepository) getAllAnswers() ([]map[string]interface{}, error) {
	if cached, ok := r.getMemCache("all_answers"); ok {
		return cached.([]map[string]interface{}), nil
	}
	var list pbRecordList
	q := url.Values{}
	q.Set("fields", "id,response,unsur,rating_value")
	q.Set("perPage", "5000")
	if err := r.pb.Get("/api/collections/response_answers/records", q, &list); err != nil {
		return nil, err
	}
	r.setMemCache("all_answers", list.Items, 2*time.Minute)
	return list.Items, nil
}

func (r *pocketbaseRepository) getAllResponses() ([]map[string]interface{}, error) {
	if cached, ok := r.getMemCache("all_responses"); ok {
		return cached.([]map[string]interface{}), nil
	}
	var respList pbRecordList
	q := url.Values{}
	q.Set("perPage", "5000")
	q.Set("sort", "-submitted_at")
	q.Set("fields", "id,service,period,submitted_at,created")
	if err := r.pb.Get("/api/collections/responses/records", q, &respList); err != nil {
		return nil, err
	}
	r.setMemCache("all_responses", respList.Items, 2*time.Minute)
	return respList.Items, nil
}

// GetViewIndexSummary calculates weighted NRR identical to Postgres vw_index_summary
func (r *pocketbaseRepository) GetViewIndexSummary() ([]domain.ViewIndexSummaryRow, error) {
	allUnsur, err := r.ListUnsur()
	if err != nil {
		return nil, err
	}
	answers, err := r.getAllAnswers()
	if err != nil {
		return nil, err
	}

	activeUnsurIPKP := make([]models.Unsur, 0)
	activeUnsurIPAK := make([]models.Unsur, 0)
	for _, u := range allUnsur {
		if u.IsActive {
			if u.IndexType == "IPAK" {
				activeUnsurIPAK = append(activeUnsurIPAK, u)
			} else {
				activeUnsurIPKP = append(activeUnsurIPKP, u)
			}
		}
	}

	calcForType := func(indexType string, uList []models.Unsur) domain.ViewIndexSummaryRow {
		totalUnsur := float64(len(uList))
		if totalUnsur == 0 {
			return domain.ViewIndexSummaryRow{
				IndexType:     indexType,
				NilaiIndex:    0,
				NilaiKonversi: 0,
				Mutu:          "D",
				Kinerja:       "Tidak Baik",
			}
		}

		sumWeighted := 0.0
		for _, u := range uList {
			pbUID := domain.UUIDToPbID(u.ID.String())
			var uSum float64
			var uCount float64
			for _, a := range answers {
				if getString(a, "unsur") == pbUID {
					uSum += float64(getInt(a, "rating_value"))
					uCount++
				}
			}
			avg := 0.0
			if uCount > 0 {
				avg = uSum / uCount
			}
			sumWeighted += avg * (1.0 / totalUnsur)
		}

		nilaiIndex := domain.RoundTwoDecimals(sumWeighted)
		nilaiKonversi := domain.RoundTwoDecimals(sumWeighted * 25.0)

		mutu := "D"
		kinerja := "Tidak Baik"
		if nilaiKonversi >= 88.31 {
			mutu = "A"
			kinerja = "Sangat Baik"
		} else if nilaiKonversi >= 76.61 {
			mutu = "B"
			kinerja = "Baik"
		} else if nilaiKonversi >= 65.00 {
			mutu = "C"
			kinerja = "Kurang Baik"
		}

		return domain.ViewIndexSummaryRow{
			IndexType:     indexType,
			NilaiIndex:    nilaiIndex,
			NilaiKonversi: nilaiKonversi,
			Mutu:          mutu,
			Kinerja:       kinerja,
		}
	}

	return []domain.ViewIndexSummaryRow{
		calcForType("IPKP", activeUnsurIPKP),
		calcForType("IPAK", activeUnsurIPAK),
	}, nil
}

// GetViewUnsurSummary calculates per-unsur summary identical to Postgres vw_unsur_summary
func (r *pocketbaseRepository) GetViewUnsurSummary() ([]domain.ViewUnsurSummaryRow, error) {
	allUnsur, err := r.ListUnsur()
	if err != nil {
		return nil, err
	}
	answers, err := r.getAllAnswers()
	if err != nil {
		return nil, err
	}

	totalIPKP := 0.0
	totalIPAK := 0.0
	for _, u := range allUnsur {
		if u.IsActive {
			if u.IndexType == "IPAK" {
				totalIPAK++
			} else {
				totalIPKP++
			}
		}
	}

	res := make([]domain.ViewUnsurSummaryRow, 0, len(allUnsur))
	for _, u := range allUnsur {
		pbUID := domain.UUIDToPbID(u.ID.String())
		var sum float64
		var count int64
		respSet := make(map[string]bool)
		for _, a := range answers {
			if getString(a, "unsur") == pbUID {
				sum += float64(getInt(a, "rating_value"))
				count++
				respSet[getString(a, "response")] = true
			}
		}

		avg := 0.0
		if count > 0 {
			avg = sum / float64(count)
		}
		weight := 1.0 / totalIPKP
		if u.IndexType == "IPAK" && totalIPAK > 0 {
			weight = 1.0 / totalIPAK
		}
		weighted := avg * weight

		res = append(res, domain.ViewUnsurSummaryRow{
			ServiceID:               "",
			ServiceName:             "",
			UnsurID:                 u.ID.String(),
			UnsurName:               u.Name,
			IndexType:               u.IndexType,
			JumlahPertanyaan:        1,
			TotalNilai:              sum,
			NilaiRataRataUnsur:      domain.RoundTwoDecimals(avg),
			NilaiRataRataTertimbang: domain.RoundTwoDecimals(weighted),
			JumlahResponden:         int64(len(respSet)),
		})
	}

	sort.Slice(res, func(i, j int) bool {
		if res[i].IndexType == res[j].IndexType {
			return res[i].UnsurName < res[j].UnsurName
		}
		return res[i].IndexType > res[j].IndexType
	})

	return res, nil
}

// GetViewServiceStats calculates summary grouped by service
func (r *pocketbaseRepository) GetViewServiceStats() ([]domain.ViewServiceStatRow, error) {
	services, err := r.ListActiveServices()
	if err != nil {
		return nil, err
	}
	answers, err := r.getAllAnswers()
	if err != nil {
		return nil, err
	}

	respItems, err := r.getAllResponses()
	if err != nil {
		return nil, err
	}

	respServiceMap := make(map[string]string)
	for _, rItem := range respItems {
		respServiceMap[getString(rItem, "id")] = getString(rItem, "service")
	}

	allUnsur, _ := r.ListUnsur()
	unsurTypeMap := make(map[string]string)
	for _, u := range allUnsur {
		unsurTypeMap[domain.UUIDToPbID(u.ID.String())] = u.IndexType
	}

	res := make([]domain.ViewServiceStatRow, 0)
	for _, s := range services {
		pbSID := domain.UUIDToPbID(s.ID.String())
		for _, idxType := range []string{"IPKP", "IPAK"} {
			var sum float64
			var count float64
			respSet := make(map[string]bool)
			for _, a := range answers {
				rID := getString(a, "response")
				if respServiceMap[rID] == pbSID {
					uID := getString(a, "unsur")
					if unsurTypeMap[uID] == idxType {
						sum += float64(getInt(a, "rating_value"))
						count++
						respSet[rID] = true
					}
				}
			}

			if len(respSet) == 0 {
				continue
			}

			nilaiIndex := 0.0
			if count > 0 {
				nilaiIndex = domain.RoundTwoDecimals(sum / count)
			}
			nilaiKonversi := domain.RoundTwoDecimals((nilaiIndex / 4.0) * 100.0)

			mutu := "D"
			if nilaiKonversi >= 88.31 {
				mutu = "A"
			} else if nilaiKonversi >= 76.61 {
				mutu = "B"
			} else if nilaiKonversi >= 65.00 {
				mutu = "C"
			}

			res = append(res, domain.ViewServiceStatRow{
				ServiceID:       s.ID.String(),
				ServiceName:     s.Name,
				IndexType:       idxType,
				NilaiIndex:      nilaiIndex,
				NilaiKonversi:   nilaiKonversi,
				Mutu:            mutu,
				JumlahResponden: int64(len(respSet)),
			})
		}
	}

	return res, nil
}

// GetIndexTrend calculates weekly / monthly trend
func (r *pocketbaseRepository) GetIndexTrend() ([]domain.IndexTrendRow, error) {
	respItems, err := r.getAllResponses()
	if err != nil {
		return nil, err
	}

	answers, err := r.getAllAnswers()
	if err != nil {
		return nil, err
	}

	respDateMap := make(map[string]string)
	for _, rItem := range respItems {
		t := parseTime(rItem["submitted_at"])
		if t.IsZero() {
			t = parseTime(rItem["created"])
		}
		respDateMap[getString(rItem, "id")] = t.Format("2006-01")
	}

	allUnsur, _ := r.ListUnsur()
	unsurTypeMap := make(map[string]string)
	for _, u := range allUnsur {
		unsurTypeMap[domain.UUIDToPbID(u.ID.String())] = u.IndexType
	}

	type trendKey struct {
		Bulan     string
		IndexType string
	}
	trendGroup := make(map[trendKey][]float64)

	for _, a := range answers {
		rID := getString(a, "response")
		bulan := respDateMap[rID]
		if bulan == "" {
			continue
		}
		uID := getString(a, "unsur")
		idxType := unsurTypeMap[uID]
		if idxType == "" {
			idxType = "IPKP"
		}
		k := trendKey{Bulan: bulan, IndexType: idxType}
		trendGroup[k] = append(trendGroup[k], float64(getInt(a, "rating_value")))
	}

	res := make([]domain.IndexTrendRow, 0, len(trendGroup))
	for k, ratings := range trendGroup {
		sum := 0.0
		for _, val := range ratings {
			sum += val
		}
		avg := sum / float64(len(ratings))
		konversi := domain.RoundTwoDecimals((avg / 4.0) * 100.0)
		res = append(res, domain.IndexTrendRow{
			Bulan:         k.Bulan,
			IndexType:     k.IndexType,
			NilaiKonversi: konversi,
		})
	}

	sort.Slice(res, func(i, j int) bool {
		return res[i].Bulan < res[j].Bulan
	})

	return res, nil
}

// GetDemographicSummary calculates demographic options counts
func (r *pocketbaseRepository) GetDemographicSummary() ([]domain.DemographicSummaryRow, error) {
	var demoList pbRecordList
	q := url.Values{}
	q.Set("perPage", "5000")
	if err := r.pb.Get("/api/collections/response_demographics/records", q, &demoList); err != nil {
		return nil, err
	}

	respItems, _ := r.getAllResponses()

	services, _ := r.ListActiveServices()
	servNameMap := make(map[string]string)
	for _, s := range services {
		servNameMap[domain.UUIDToPbID(s.ID.String())] = s.Name
	}

	respServiceMap := make(map[string]string)
	for _, rItem := range respItems {
		sID := getString(rItem, "service")
		respServiceMap[getString(rItem, "id")] = servNameMap[sID]
	}

	fields, _ := r.ListAllDemographicFieldsAdmin()
	fieldKeyMap := make(map[string]string)
	for _, f := range fields {
		fieldKeyMap[domain.UUIDToPbID(f.ID.String())] = f.FieldKey
	}

	type dKey struct {
		ServiceName string
		FieldKey    string
		Value       string
	}
	counts := make(map[dKey]int64)

	for _, d := range demoList.Items {
		rID := getString(d, "response")
		fID := getString(d, "field")
		val := getString(d, "value")
		sName := respServiceMap[rID]
		fKey := fieldKeyMap[fID]
		if fKey != "" && val != "" {
			k := dKey{ServiceName: sName, FieldKey: fKey, Value: val}
			counts[k]++
		}
	}

	res := make([]domain.DemographicSummaryRow, 0, len(counts))
	for k, cnt := range counts {
		res = append(res, domain.DemographicSummaryRow{
			ServiceName:      k.ServiceName,
			FieldKey:         k.FieldKey,
			DemographicValue: k.Value,
			Count:            cnt,
		})
	}

	return res, nil
}

func (r *pocketbaseRepository) GetArchiveRawAnswers(startDate, endDate string) (int64, []domain.CombinedRawAnswer, error) {
	// 1. Identify target periods matching the date range [startDate, endDate]
	periods, _ := r.ListPeriods()
	targetPeriodPbIDs := make(map[string]bool)
	startClean := cleanDateOnly(startDate)
	endClean := cleanDateOnly(endDate)

	for _, p := range periods {
		pStart := cleanDateOnly(p.StartDate)
		pEnd := cleanDateOnly(p.EndDate)
		if (startClean == "" || pStart >= startClean) && (endClean == "" || pEnd <= endClean) {
			pbID := domain.UUIDToPbID(p.ID.String())
			if pbID != "" {
				targetPeriodPbIDs[pbID] = true
			}
			targetPeriodPbIDs[p.ID.String()] = true
		}
	}

	// 2. Fetch responses from PocketBase (shared lightweight cache)
	respItems, err := r.getAllResponses()
	if err != nil {
		return 0, nil, err
	}

	if len(respItems) == 0 {
		return 0, []domain.CombinedRawAnswer{}, nil
	}

	services, _ := r.ListAllServicesAdmin()
	servNameMap := make(map[string]string)
	for _, s := range services {
		servNameMap[domain.UUIDToPbID(s.ID.String())] = s.Name
	}

	unsurs, _ := r.ListUnsur()
	unsurMap := make(map[string]models.Unsur)
	for _, u := range unsurs {
		unsurMap[domain.UUIDToPbID(u.ID.String())] = u
	}

	type rMeta struct {
		ServiceID   uuid.UUID
		ServiceName string
		Bulan       string
	}
	respMeta := make(map[string]rMeta, len(respItems))
	var filteredRespCount int64

	for _, rItem := range respItems {
		periodID := getString(rItem, "period")
		rawSub := getString(rItem, "submitted_at")
		if rawSub == "" {
			rawSub = getString(rItem, "created")
		}
		dateStr := cleanDateOnly(rawSub)

		// Period-aware matching: if response has a period, check against target periods for this archive
		if periodID != "" {
			pbMatch := targetPeriodPbIDs[periodID] || targetPeriodPbIDs[domain.UUIDToPbID(periodID)]
			if !pbMatch {
				continue
			}
		} else {
			if startClean != "" && dateStr != "" && dateStr < startClean {
				continue
			}
			if endClean != "" && dateStr != "" && dateStr > endClean {
				continue
			}
		}

		filteredRespCount++
		rID := getString(rItem, "id")
		sPbID := getString(rItem, "service")
		bulan := "2026-01"
		if len(dateStr) >= 7 {
			bulan = dateStr[:7]
		}
		respMeta[rID] = rMeta{
			ServiceID:   domain.PbIDToUUID(sPbID),
			ServiceName: servNameMap[sPbID],
			Bulan:       bulan,
		}
	}

	if filteredRespCount == 0 {
		return 0, []domain.CombinedRawAnswer{}, nil
	}

	answers, err := r.getAllAnswers()
	if err != nil {
		return filteredRespCount, nil, err
	}

	rawAnswers := make([]domain.CombinedRawAnswer, 0)
	for _, a := range answers {
		rID := getString(a, "response")
		meta, ok := respMeta[rID]
		if !ok {
			continue
		}
		uPbID := getString(a, "unsur")
		uObj := unsurMap[uPbID]

		rawAnswers = append(rawAnswers, domain.CombinedRawAnswer{
			ResponseID:  domain.PbIDToUUID(rID),
			ServiceID:   meta.ServiceID,
			ServiceName: meta.ServiceName,
			UnsurID:     domain.PbIDToUUID(uPbID),
			UnsurName:   uObj.Name,
			IndexType:   uObj.IndexType,
			RatingValue: getInt(a, "rating_value"),
			Bulan:       meta.Bulan,
		})
	}

	return filteredRespCount, rawAnswers, nil
}

func (r *pocketbaseRepository) GetArchiveDemographicSummary(startDate, endDate string) ([]domain.DemographicSummaryRow, error) {
	// 1. Identify target periods matching the date range [startDate, endDate]
	periods, _ := r.ListPeriods()
	targetPeriodPbIDs := make(map[string]bool)
	startClean := cleanDateOnly(startDate)
	endClean := cleanDateOnly(endDate)

	for _, p := range periods {
		pStart := cleanDateOnly(p.StartDate)
		pEnd := cleanDateOnly(p.EndDate)
		if (startClean == "" || pStart >= startClean) && (endClean == "" || pEnd <= endClean) {
			pbID := domain.UUIDToPbID(p.ID.String())
			if pbID != "" {
				targetPeriodPbIDs[pbID] = true
			}
			targetPeriodPbIDs[p.ID.String()] = true
		}
	}

	respItems, err := r.getAllResponses()
	if err != nil || len(respItems) == 0 {
		return []domain.DemographicSummaryRow{}, nil
	}

	validRespIDs := make(map[string]bool, len(respItems))
	respServiceMap := make(map[string]string, len(respItems))
	for _, rItem := range respItems {
		periodID := getString(rItem, "period")
		rawSub := getString(rItem, "submitted_at")
		if rawSub == "" {
			rawSub = getString(rItem, "created")
		}
		dateStr := cleanDateOnly(rawSub)

		if periodID != "" {
			pbMatch := targetPeriodPbIDs[periodID] || targetPeriodPbIDs[domain.UUIDToPbID(periodID)]
			if !pbMatch {
				continue
			}
		} else {
			if startClean != "" && dateStr != "" && dateStr < startClean {
				continue
			}
			if endClean != "" && dateStr != "" && dateStr > endClean {
				continue
			}
		}

		rID := getString(rItem, "id")
		validRespIDs[rID] = true
		respServiceMap[rID] = getString(rItem, "service")
	}

	if len(validRespIDs) == 0 {
		return []domain.DemographicSummaryRow{}, nil
	}

	services, _ := r.ListActiveServices()
	servNameMap := make(map[string]string)
	for _, s := range services {
		servNameMap[domain.UUIDToPbID(s.ID.String())] = s.Name
	}

	fields, _ := r.ListAllDemographicFieldsAdmin()
	fieldKeyMap := make(map[string]string)
	for _, f := range fields {
		fieldKeyMap[domain.UUIDToPbID(f.ID.String())] = f.FieldKey
	}

	var demoList pbRecordList
	if cached, ok := r.getMemCache("all_response_demographics"); ok {
		demoList = cached.(pbRecordList)
	} else {
		qDemo := url.Values{}
		qDemo.Set("perPage", "5000")
		qDemo.Set("fields", "id,response,field,value")
		if err := r.pb.Get("/api/collections/response_demographics/records", qDemo, &demoList); err != nil {
			return nil, err
		}
		r.setMemCache("all_response_demographics", demoList, 2*time.Minute)
	}

	type dKey struct {
		ServiceName string
		FieldKey    string
		Value       string
	}
	counts := make(map[dKey]int64)

	for _, d := range demoList.Items {
		rID := getString(d, "response")
		if !validRespIDs[rID] {
			continue
		}
		sPbID := respServiceMap[rID]
		sName := servNameMap[sPbID]
		fID := getString(d, "field")
		val := getString(d, "value")
		fKey := fieldKeyMap[fID]
		if fKey != "" && val != "" {
			k := dKey{ServiceName: sName, FieldKey: fKey, Value: val}
			counts[k]++
		}
	}

	res := make([]domain.DemographicSummaryRow, 0, len(counts))
	for k, cnt := range counts {
		res = append(res, domain.DemographicSummaryRow{
			ServiceName:      k.ServiceName,
			FieldKey:         k.FieldKey,
			DemographicValue: k.Value,
			Count:            cnt,
		})
	}
	return res, nil
}
