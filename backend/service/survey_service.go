package service

import (
	"fmt"
	"sync"
	"time"

	"survey-kemenag-backend/domain"
	"survey-kemenag-backend/models"
	"survey-kemenag-backend/repository"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type SurveyService struct {
	repo repository.Repository
}

func NewSurveyService(repo repository.Repository) *SurveyService {
	return &SurveyService{repo: repo}
}

func (s *SurveyService) GetPublicResults() (fiber.Map, error) {
	cacheKey := "public_results"
	if cachedData, found := globalCache.Get(cacheKey); found {
		return cachedData.(fiber.Map), nil
	}

	activePeriod, _ := s.repo.GetActivePeriod()


	totalResponses, err := s.repo.CountTotalResponses()
	if err != nil {
		return nil, err
	}

	// --- Read from vw_index_summary (weighted NRR) ---
	viewIndex, err := s.repo.GetViewIndexSummary()
	if err != nil {
		return nil, err
	}

	ipkpScore := 0.0
	ipakScore := 0.0
	indexSummary := make([]fiber.Map, 0, len(viewIndex))
	for _, vi := range viewIndex {
		if vi.IndexType == "IPAK" {
			ipakScore = vi.NilaiKonversi
		} else {
			ipkpScore = vi.NilaiKonversi
		}
		indexSummary = append(indexSummary, fiber.Map{
			"index_type":      vi.IndexType,
			"score":           vi.NilaiKonversi,
			"nilai_konversi":  vi.NilaiKonversi,
			"nilai_index":     vi.NilaiIndex,
			"mutu":            vi.Mutu,
			"kategori_mutu":   vi.Mutu,
			"mutu_pelayanan":  vi.Kinerja,
			"total_responden": totalResponses,
		})
	}

	// --- Read from vw_unsur_summary ---
	viewUnsur, err := s.repo.GetViewUnsurSummary()
	if err != nil {
		return nil, err
	}

	unsurSummary := make([]domain.UnsurStat, 0, len(viewUnsur))
	for _, u := range viewUnsur {
		konversi := domain.RoundTwoDecimals(u.NilaiRataRataUnsur * 25)
		nrr := domain.RoundTwoDecimals(u.NilaiRataRataUnsur)
		unsurSummary = append(unsurSummary, domain.UnsurStat{
			ServiceID:          u.ServiceID,
			ServiceName:        u.ServiceName,
			UnsurID:            u.UnsurID,
			UnsurName:          u.UnsurName,
			IndexType:          u.IndexType,
			Score:              konversi,
			NRR:                nrr,
			NilaiRataRataUnsur: nrr,
			Mutu:               domain.GetMutuLabel(konversi),
			JumlahPertanyaan:   u.JumlahPertanyaan,
			TotalNilai:         u.TotalNilai,
			JumlahResponden:    u.JumlahResponden,
		})
	}

	// --- Read from vw_index_summary_by_service ---
	viewService, err := s.repo.GetViewServiceStats()
	if err != nil {
		return nil, err
	}

	byServiceSummary := make([]domain.ByServiceStat, 0, len(viewService))
	for _, vs := range viewService {
		byServiceSummary = append(byServiceSummary, domain.ByServiceStat{
			ServiceID:       vs.ServiceID,
			ServiceName:     vs.ServiceName,
			IndexType:       vs.IndexType,
			NilaiIndex:      vs.NilaiIndex,
			NilaiKonversi:   vs.NilaiKonversi,
			Mutu:            vs.Mutu,
			JumlahResponden: vs.JumlahResponden,
		})
	}

	trendData, _ := s.repo.GetIndexTrend()
	if trendData == nil {
		trendData = []domain.IndexTrendRow{}
	}

	demoData, _ := s.repo.GetDemographicSummary()
	if demoData == nil {
		demoData = []domain.DemographicSummaryRow{}
	}

	res := fiber.Map{
		"period":          activePeriod,
		"total_responses": totalResponses,
		"ipkp_score":      ipkpScore,
		"ipak_score":      ipakScore,
		"ikm_score":       ipkpScore,
		"index_summary":   indexSummary,
		"unsur_summary":   unsurSummary,
		"by_service":      byServiceSummary,
		"trend":           trendData,
		"demographics":    demoData,
	}

	// Cache for 10 minutes (will be invalidated on new submit)
	globalCache.Set(cacheKey, res, 10*time.Minute)
	return res, nil
}



func (s *SurveyService) GetAdminStats() (fiber.Map, error) {
	cacheKey := "admin_stats"
	if cachedData, found := globalCache.Get(cacheKey); found {
		return cachedData.(fiber.Map), nil
	}

	var (
		totalResponses int64
		activeServices int64
		totalUnsur     int64
		activePeriod   *models.SurveyPeriod
		results        []domain.AnswerUnsurRaw
		errResp, errServ, errUnsur, errRes error
	)

	var wg sync.WaitGroup
	wg.Add(5)

	go func() {
		defer wg.Done()
		totalResponses, errResp = s.repo.CountTotalResponses()
	}()

	go func() {
		defer wg.Done()
		activeServices, errServ = s.repo.CountActiveServices()
	}()

	go func() {
		defer wg.Done()
		totalUnsur, errUnsur = s.repo.CountActiveUnsur()
	}()

	go func() {
		defer wg.Done()
		activePeriod, _ = s.repo.GetActivePeriod()
	}()

	go func() {
		defer wg.Done()
		results, errRes = s.repo.GetAnswerUnsurRawList()
	}()

	wg.Wait()

	if errResp != nil {
		return nil, errResp
	}
	if errServ != nil {
		return nil, errServ
	}
	if errUnsur != nil {
		return nil, errUnsur
	}
	if errRes != nil {
		results = nil
	}

	ipkpScore := 0.0
	ipakScore := 0.0

	if len(results) > 0 {
		var ipkpSum, ipakSum float64
		var ipkpCount, ipakCount int64
		for _, r := range results {
			if r.IndexType == "IPAK" {
				ipakSum += float64(r.RatingValue)
				ipakCount++
			} else {
				ipkpSum += float64(r.RatingValue)
				ipkpCount++
			}
		}
		if ipkpCount > 0 {
			ipkpScore = domain.RoundTwoDecimals(((ipkpSum / float64(ipkpCount)) / 4.0) * 100.0)
		}
		if ipakCount > 0 {
			ipakScore = domain.RoundTwoDecimals(((ipakSum / float64(ipakCount)) / 4.0) * 100.0)
		}
	}

	result := fiber.Map{
		"total_responses": totalResponses,
		"active_services": activeServices,
		"total_unsur":     totalUnsur,
		"active_period":   activePeriod,
		"ipkp_score":      ipkpScore,
		"ipak_score":      ipakScore,
	}
	globalCache.Set(cacheKey, result, 5*time.Minute)

	return result, nil
}

func (s *SurveyService) GetArchiveResults(startDate, endDate string) (fiber.Map, error) {
	cacheKey := fmt.Sprintf("archive_results_%s_%s", startDate, endDate)
	if cachedData, found := globalCache.Get(cacheKey); found {
		return cachedData.(fiber.Map), nil
	}

	db := s.repo.DB()

	// 1. Check total responses in range
	respQuery := db.Model(&models.Response{})
	if startDate != "" {
		respQuery = respQuery.Where("submitted_at::date >= ?::date", startDate)
	}
	if endDate != "" {
		respQuery = respQuery.Where("submitted_at::date <= ?::date", endDate)
	}

	var totalResponses int64
	if err := respQuery.Count(&totalResponses).Error; err != nil {
		return nil, err
	}

	emptyResult := fiber.Map{
		"total_responses": totalResponses,
		"ipkp_score":      0.0,
		"ipak_score":      0.0,
		"by_service":      []domain.ByServiceStat{},
		"unsur_summary":   []domain.UnsurStat{},
		"demographics":    []domain.DemographicSummaryRow{},
		"index_summary": []domain.ViewIndexSummaryRow{
			{IndexType: "IPKP", NilaiIndex: 0.0, NilaiKonversi: 0.0, Mutu: "Belum Terisi", Kinerja: "Belum Terisi"},
			{IndexType: "IPAK", NilaiIndex: 0.0, NilaiKonversi: 0.0, Mutu: "Belum Terisi", Kinerja: "Belum Terisi"},
		},
		"trend": []domain.IndexTrendRow{},
	}

	if totalResponses == 0 {
		globalCache.Set(cacheKey, emptyResult, 10*time.Minute)
		return emptyResult, nil
	}

	// 2. Fetch all raw answer points in 1 unified query
	type CombinedRawAnswer struct {
		ResponseID  uuid.UUID `gorm:"column:response_id"`
		ServiceID   uuid.UUID `gorm:"column:service_id"`
		ServiceName string    `gorm:"column:service_name"`
		UnsurID     uuid.UUID `gorm:"column:unsur_id"`
		UnsurName   string    `gorm:"column:unsur_name"`
		IndexType   string    `gorm:"column:index_type"`
		RatingValue int       `gorm:"column:rating_value"`
		Bulan       string    `gorm:"column:bulan"`
	}

	var rawAnswers []CombinedRawAnswer
	answerQuery := db.Table("kemenag_survey.response_answers ra").
		Select("ra.response_id, r.service_id, s.name as service_name, q.unsur_id, u.name as unsur_name, u.index_type, ra.rating_value, to_char(r.submitted_at, 'YYYY-MM') as bulan").
		Joins("JOIN kemenag_survey.responses r ON ra.response_id = r.id").
		Joins("JOIN kemenag_survey.services s ON r.service_id = s.id").
		Joins("JOIN kemenag_survey.questions q ON ra.question_id = q.id").
		Joins("JOIN kemenag_survey.unsur u ON q.unsur_id = u.id")

	if startDate != "" {
		answerQuery = answerQuery.Where("r.submitted_at::date >= ?::date", startDate)
	}
	if endDate != "" {
		answerQuery = answerQuery.Where("r.submitted_at::date <= ?::date", endDate)
	}

	if err := answerQuery.Scan(&rawAnswers).Error; err != nil {
		return nil, err
	}

	// Calculate everything in-memory from rawAnswers in CPU
	var ipkpSum, ipakSum float64
	var ipkpCount, ipakCount int64

	type sKey struct {
		ServiceID string
		IndexType string
	}
	type sGroup struct {
		ServiceName string
		Ratings     map[string]int
		ResponseIDs map[uuid.UUID]bool
	}
	byServiceMap := make(map[sKey]*sGroup)

	type uGroup struct {
		UnsurID   uuid.UUID
		UnsurName string
		IndexType string
		Sum       float64
		Count     int64
	}
	byUnsurMap := make(map[uuid.UUID]*uGroup)

	type tKey struct {
		Bulan     string
		IndexType string
	}
	type tGroup struct {
		Sum   float64
		Count int64
	}
	trendMap := make(map[tKey]*tGroup)

	for _, a := range rawAnswers {
		// Overall
		if a.IndexType == "IPAK" {
			ipakSum += float64(a.RatingValue)
			ipakCount++
		} else {
			ipkpSum += float64(a.RatingValue)
			ipkpCount++
		}

		// Service
		sk := sKey{ServiceID: a.ServiceID.String(), IndexType: a.IndexType}
		if _, exists := byServiceMap[sk]; !exists {
			byServiceMap[sk] = &sGroup{
				ServiceName: a.ServiceName,
				Ratings:     make(map[string]int),
				ResponseIDs: make(map[uuid.UUID]bool),
			}
		}
		sg := byServiceMap[sk]
		sg.Ratings[a.ResponseID.String()] += a.RatingValue
		sg.ResponseIDs[a.ResponseID] = true

		// Unsur
		if _, exists := byUnsurMap[a.UnsurID]; !exists {
			byUnsurMap[a.UnsurID] = &uGroup{
				UnsurID:   a.UnsurID,
				UnsurName: a.UnsurName,
				IndexType: a.IndexType,
			}
		}
		ug := byUnsurMap[a.UnsurID]
		ug.Sum += float64(a.RatingValue)
		ug.Count++

		// Trend
		tk := tKey{Bulan: a.Bulan, IndexType: a.IndexType}
		if _, exists := trendMap[tk]; !exists {
			trendMap[tk] = &tGroup{}
		}
		tg := trendMap[tk]
		tg.Sum += float64(a.RatingValue)
		tg.Count++
	}

	ipkpScore := 0.0
	ipakScore := 0.0
	if ipkpCount > 0 {
		ipkpScore = domain.RoundTwoDecimals(((ipkpSum / float64(ipkpCount)) / 4.0) * 100.0)
	}
	if ipakCount > 0 {
		ipakScore = domain.RoundTwoDecimals(((ipakSum / float64(ipakCount)) / 4.0) * 100.0)
	}

	var byServiceList []domain.ByServiceStat
	for k, g := range byServiceMap {
		totalUnsur := 9.0
		if k.IndexType == "IPAK" {
			totalUnsur = 5.0
		}
		sumScores := 0.0
		for _, sumRating := range g.Ratings {
			avg := float64(sumRating) / totalUnsur
			sumScores += avg
		}
		totalRespCount := float64(len(g.ResponseIDs))
		nilaiIndex := 0.0
		nilaiKonversi := 0.0
		if totalRespCount > 0 {
			nilaiIndex = domain.RoundTwoDecimals(sumScores / totalRespCount)
			nilaiKonversi = domain.RoundTwoDecimals((nilaiIndex / 4.0) * 100.0)
		}
		mutu := "D"
		if nilaiKonversi >= 88.31 {
			mutu = "A"
		} else if nilaiKonversi >= 76.61 {
			mutu = "B"
		} else if nilaiKonversi >= 65.00 {
			mutu = "C"
		}
		byServiceList = append(byServiceList, domain.ByServiceStat{
			ServiceID:       k.ServiceID,
			ServiceName:     g.ServiceName,
			IndexType:       k.IndexType,
			NilaiIndex:      nilaiIndex,
			NilaiKonversi:   nilaiKonversi,
			Mutu:            mutu,
			JumlahResponden: int64(totalRespCount),
		})
	}

	var unsurList []domain.UnsurStat
	for _, u := range byUnsurMap {
		avg := 0.0
		if u.Count > 0 {
			avg = domain.RoundTwoDecimals(u.Sum / float64(u.Count))
		}
		divider := 9.0
		if u.IndexType == "IPAK" {
			divider = 5.0
		}
		nrrTertimbang := domain.RoundTwoDecimals(avg / divider)
		mutuText := domain.GetMutuText((avg / 4.0) * 100.0)

		unsurList = append(unsurList, domain.UnsurStat{
			UnsurID:            u.UnsurID.String(),
			UnsurName:          u.UnsurName,
			IndexType:          u.IndexType,
			NilaiRataRataUnsur: avg,
			NRR:                nrrTertimbang,
			Score:              domain.RoundTwoDecimals((avg / 4.0) * 100.0),
			Mutu:               mutuText,
			JumlahPertanyaan:   1,
			TotalNilai:         u.Sum,
			JumlahResponden:    u.Count,
		})
	}

	var trendList []domain.IndexTrendRow
	for k, g := range trendMap {
		score := 0.0
		if g.Count > 0 {
			score = domain.RoundTwoDecimals(((g.Sum / float64(g.Count)) / 4.0) * 100.0)
		}
		trendList = append(trendList, domain.IndexTrendRow{
			Bulan:         k.Bulan,
			IndexType:     k.IndexType,
			NilaiKonversi: score,
		})
	}

	// 3. Demographics Query
	var demoList []domain.DemographicSummaryRow
	demoQuery := db.Table("kemenag_survey.response_demographics rd").
		Select("df.field_key, rd.value as demographic_value, count(rd.id) as count").
		Joins("JOIN kemenag_survey.responses r ON rd.response_id = r.id").
		Joins("JOIN kemenag_survey.demographic_fields df ON rd.field_id = df.id").
		Group("df.field_key, rd.value")

	if startDate != "" {
		demoQuery = demoQuery.Where("r.submitted_at::date >= ?::date", startDate)
	}
	if endDate != "" {
		demoQuery = demoQuery.Where("r.submitted_at::date <= ?::date", endDate)
	}
	_ = demoQuery.Scan(&demoList).Error

	indexSummary := []domain.ViewIndexSummaryRow{
		{
			IndexType:     "IPKP",
			NilaiIndex:    domain.RoundTwoDecimals(ipkpScore / 25.0),
			NilaiKonversi: ipkpScore,
			Mutu:          domain.GetMutuLabel(ipkpScore),
			Kinerja:       domain.GetMutuText(ipkpScore),
		},
		{
			IndexType:     "IPAK",
			NilaiIndex:    domain.RoundTwoDecimals(ipakScore / 25.0),
			NilaiKonversi: ipakScore,
			Mutu:          domain.GetMutuLabel(ipakScore),
			Kinerja:       domain.GetMutuText(ipakScore),
		},
	}

	result := fiber.Map{
		"total_responses": totalResponses,
		"ipkp_score":      ipkpScore,
		"ipak_score":      ipakScore,
		"by_service":      byServiceList,
		"unsur_summary":   unsurList,
		"demographics":    demoList,
		"index_summary":   indexSummary,
		"trend":           trendList,
	}
	globalCache.Set(cacheKey, result, 10*time.Minute)

	return result, nil
}

func (s *SurveyService) SubmitSurvey(req *domain.SubmitSurveyRequest, clientIP string) (uuid.UUID, error) {
	var activePeriod models.SurveyPeriod
	if cachedPeriod, found := globalCache.Get("survey_active_period"); found {
		if p, ok := cachedPeriod.(models.SurveyPeriod); ok {
			activePeriod = p
		} else if pPtr, ok := cachedPeriod.(*models.SurveyPeriod); ok && pPtr != nil {
			activePeriod = *pPtr
		}
	}
	if activePeriod.ID == uuid.Nil {
		p, err := s.repo.GetActivePeriod()
		if err != nil {
			return uuid.Nil, fiber.NewError(fiber.StatusBadRequest, "Tidak ada periode survei aktif saat ini")
		}
		activePeriod = *p
		globalCache.Set("survey_active_period", activePeriod, 10*time.Minute)
	}

	serviceID, err := uuid.Parse(req.ServiceID)
	if err != nil {
		return uuid.Nil, fiber.NewError(fiber.StatusBadRequest, "Service ID tidak valid")
	}

	db := s.repo.DB()
	tx := db.Begin()

	// Feature 4: IP Hashing for PDP Law Compliance (Privacy Anonymization)
	hashedIP := HashIP(clientIP)

	resp := models.Response{
		ServiceID:         serviceID,
		PeriodID:          activePeriod.ID,
		IsAnonymous:       req.IsAnonymous,
		RespondentName:    req.RespondentName,
		RespondentContact: req.RespondentContact,
		Locale:            req.Locale,
		IPKPFeedback:      req.IPKPFeedback,
		IPAKFeedback:      req.IPAKFeedback,
		IPAddress:         hashedIP,
		SubmittedAt:       time.Now(),
	}
	if resp.Locale == "" {
		resp.Locale = "id"
	}

	if err := tx.Create(&resp).Error; err != nil {
		tx.Rollback()
		return uuid.Nil, fiber.NewError(fiber.StatusInternalServerError, "Gagal menyimpan data respon survei")
	}

	// 1. Bulk insert demographics
	var demoList []models.ResponseDemographic
	for fieldIDStr, val := range req.Demographics {
		fieldID, err := uuid.Parse(fieldIDStr)
		if err == nil && val != "" {
			demoList = append(demoList, models.ResponseDemographic{
				ResponseID: resp.ID,
				FieldID:    fieldID,
				Value:      val,
			})
		}
	}
	if len(demoList) > 0 {
		if err := tx.Create(&demoList).Error; err != nil {
			tx.Rollback()
			return uuid.Nil, fiber.NewError(fiber.StatusInternalServerError, "Gagal menyimpan demografi respon")
		}
	}

	// 2. Pre-fetch all active questions (from memory cache when available)
	var allQuestions []models.Question
	if cachedForm, found := globalCache.Get("survey_form_questions"); found {
		if m, ok := cachedForm.(fiber.Map); ok {
			if qList, ok := m["questions"].([]models.Question); ok {
				allQuestions = qList
			}
		}
	}
	if len(allQuestions) == 0 {
		var err error
		allQuestions, err = s.repo.ListActiveQuestions()
		if err != nil {
			tx.Rollback()
			return uuid.Nil, fiber.NewError(fiber.StatusInternalServerError, "Gagal memuat pertanyaan survei")
		}
	}

	questionMap := make(map[uuid.UUID]models.Question, len(allQuestions))
	for _, q := range allQuestions {
		questionMap[q.ID] = q
	}

	// 3. Bulk insert response answers
	var answerList []models.ResponseAnswer
	for qIDStr, rating := range req.Answers {
		qID, err := uuid.Parse(qIDStr)
		if err == nil && rating >= 1 && rating <= 4 {
			if q, exists := questionMap[qID]; exists {
				answerList = append(answerList, models.ResponseAnswer{
					ResponseID:  resp.ID,
					QuestionID:  q.ID,
					UnsurID:     q.UnsurID,
					RatingValue: rating,
				})
			}
		}
	}
	if len(answerList) > 0 {
		if err := tx.Create(&answerList).Error; err != nil {
			tx.Rollback()
			return uuid.Nil, fiber.NewError(fiber.StatusInternalServerError, "Gagal menyimpan jawaban survei")
		}
	}

	if err := tx.Commit().Error; err != nil {
		return uuid.Nil, err
	}

	// Feature 1: Instant Cache Invalidation so public score updates instantly
	globalCache.Delete("public_results")

	// Feature 3: Async Goroutine for non-blocking Audit Log recording
	go func(rID uuid.UUID) {
		_ = s.repo.WriteAuditLog(&models.AuditLog{
			UserEmail:  "system@kemenag.go.id",
			Action:     "SUBMIT_SURVEY",
			EntityName: "Response",
			EntityID:   rID.String(),
			Details:    "{}",
		})
	}(resp.ID)

	return resp.ID, nil
}

