package service

import (
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
	totalResponses, err := s.repo.CountTotalResponses()
	if err != nil {
		return nil, err
	}

	activeServices, err := s.repo.CountActiveServices()
	if err != nil {
		return nil, err
	}

	totalUnsur, err := s.repo.CountActiveUnsur()
	if err != nil {
		return nil, err
	}

	activePeriod, _ := s.repo.GetActivePeriod()

	ipkpScore := 0.0
	ipakScore := 0.0

	results, err := s.repo.GetAnswerUnsurRawList()
	if err == nil && len(results) > 0 {
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

	return fiber.Map{
		"total_responses": totalResponses,
		"active_services": activeServices,
		"total_unsur":     totalUnsur,
		"active_period":   activePeriod,
		"ipkp_score":      ipkpScore,
		"ipak_score":      ipakScore,
	}, nil
}

func (s *SurveyService) GetArchiveResults(startDate, endDate string) (fiber.Map, error) {
	db := s.repo.DB()

	// Base response query filtered by submitted_at range
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

	var responses []models.Response
	respIDsQuery := db.Model(&models.Response{}).Select("id")
	if startDate != "" {
		respIDsQuery = respIDsQuery.Where("submitted_at::date >= ?::date", startDate)
	}
	if endDate != "" {
		respIDsQuery = respIDsQuery.Where("submitted_at::date <= ?::date", endDate)
	}
	respIDsQuery.Find(&responses)

	respIDs := make([]uuid.UUID, len(responses))
	for i, r := range responses {
		respIDs[i] = r.ID
	}

	ipkpScore := 0.0
	ipakScore := 0.0

	if len(respIDs) > 0 {
		var results []domain.AnswerUnsurRaw
		err := db.Table("kemenag_survey.response_answers ra").
			Select("ra.rating_value, u.index_type").
			Joins("JOIN kemenag_survey.questions q ON ra.question_id = q.id").
			Joins("JOIN kemenag_survey.unsur u ON q.unsur_id = u.id").
			Where("ra.response_id IN ?", respIDs).
			Scan(&results).Error



		if err == nil && len(results) > 0 {
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
	}

	type ServiceResultRaw struct {
		ServiceID   uuid.UUID `gorm:"column:service_id"`
		ServiceName string    `gorm:"column:service_name"`
		IndexType   string    `gorm:"column:index_type"`
		RatingValue int       `gorm:"column:rating_value"`
		ResponseID  uuid.UUID `gorm:"column:response_id"`
	}

	var byServiceList []domain.ByServiceStat

	if len(respIDs) > 0 {
		var rawResults []ServiceResultRaw
		err := db.Table("kemenag_survey.response_answers ra").
			Select("r.service_id, s.name as service_name, u.index_type, ra.rating_value, ra.response_id").
			Joins("JOIN kemenag_survey.responses r ON ra.response_id = r.id").
			Joins("JOIN kemenag_survey.services s ON r.service_id = s.id").
			Joins("JOIN kemenag_survey.questions q ON ra.question_id = q.id").
			Joins("JOIN kemenag_survey.unsur u ON q.unsur_id = u.id").
			Where("ra.response_id IN ?", respIDs).
			Scan(&rawResults).Error

		if err == nil && len(rawResults) > 0 {
			type key struct {
				ServiceID string
				IndexType string
			}
			type group struct {
				ServiceName string
				Ratings     map[string]int
				ResponseIDs map[uuid.UUID]bool
			}

			grouped := make(map[key]*group)
			for _, r := range rawResults {
				k := key{ServiceID: r.ServiceID.String(), IndexType: r.IndexType}
				if _, exists := grouped[k]; !exists {
					grouped[k] = &group{
						ServiceName: r.ServiceName,
						Ratings:     make(map[string]int),
						ResponseIDs: make(map[uuid.UUID]bool),
					}
				}
				g := grouped[k]
				g.Ratings[r.ResponseID.String()] += r.RatingValue
				g.ResponseIDs[r.ResponseID] = true
			}

			for k, g := range grouped {
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
		}
	}

	// Calculate Unsur Summary for Breakdown Table
	var unsurList []domain.UnsurStat
	if len(respIDs) > 0 {
		type UnsurRaw struct {
			UnsurID     uuid.UUID `gorm:"column:unsur_id"`
			UnsurName   string    `gorm:"column:unsur_name"`
			IndexType   string    `gorm:"column:index_type"`
			RatingValue int       `gorm:"column:rating_value"`
		}
		var rawUnsur []UnsurRaw
		err := db.Table("kemenag_survey.response_answers ra").
			Select("u.id as unsur_id, u.name as unsur_name, u.index_type, ra.rating_value").
			Joins("JOIN kemenag_survey.questions q ON ra.question_id = q.id").
			Joins("JOIN kemenag_survey.unsur u ON q.unsur_id = u.id").
			Where("ra.response_id IN ?", respIDs).
			Scan(&rawUnsur).Error

		if err == nil && len(rawUnsur) > 0 {
			type uKey struct {
				UnsurID   string
				IndexType string
			}
			type uGroup struct {
				UnsurName  string
				TotalScore float64
				Count      int64
			}
			uMap := make(map[uKey]*uGroup)
			for _, ru := range rawUnsur {
				k := uKey{UnsurID: ru.UnsurID.String(), IndexType: ru.IndexType}
				if _, ok := uMap[k]; !ok {
					uMap[k] = &uGroup{UnsurName: ru.UnsurName}
				}
				g := uMap[k]
				g.TotalScore += float64(ru.RatingValue)
				g.Count++
			}
			for k, g := range uMap {
				avg := 0.0
				if g.Count > 0 {
					avg = domain.RoundTwoDecimals(g.TotalScore / float64(g.Count))
				}
				divider := 9.0
				if k.IndexType == "IPAK" {
					divider = 5.0
				}
				nrrTertimbang := domain.RoundTwoDecimals(avg / divider)
				mutuText := domain.GetMutuText((avg / 4.0) * 100.0)

				unsurList = append(unsurList, domain.UnsurStat{
					UnsurID:            k.UnsurID,
					UnsurName:          g.UnsurName,
					IndexType:          k.IndexType,
					NilaiRataRataUnsur: avg,
					NRR:                nrrTertimbang,
					Score:              domain.RoundTwoDecimals((avg / 4.0) * 100.0),
					Mutu:               mutuText,
					JumlahPertanyaan:   1,
					TotalNilai:         g.TotalScore,
					JumlahResponden:    g.Count,
				})
			}
		}
	}

	// Calculate Demographics Breakdown (Jenis Kelamin, Education, etc.)
	var demoList []domain.DemographicSummaryRow
	if len(respIDs) > 0 {
		db.Table("kemenag_survey.response_demographics rd").
			Select("df.field_key, rd.value as demographic_value, count(rd.id) as count").
			Joins("JOIN kemenag_survey.demographic_fields df ON rd.field_id = df.id").
			Where("rd.response_id IN ?", respIDs).
			Group("df.field_key, rd.value").
			Scan(&demoList)
	}

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

	// Calculate Monthly Trend Data
	var trendList []domain.IndexTrendRow
	if len(respIDs) > 0 {
		type TrendRaw struct {
			Bulan       string `gorm:"column:bulan"`
			IndexType   string `gorm:"column:index_type"`
			RatingValue int    `gorm:"column:rating_value"`
		}
		var rawTrend []TrendRaw
		err := db.Table("kemenag_survey.response_answers ra").
			Select("to_char(r.submitted_at, 'YYYY-MM') as bulan, u.index_type, ra.rating_value").
			Joins("JOIN kemenag_survey.responses r ON ra.response_id = r.id").
			Joins("JOIN kemenag_survey.questions q ON ra.question_id = q.id").
			Joins("JOIN kemenag_survey.unsur u ON q.unsur_id = u.id").
			Where("ra.response_id IN ?", respIDs).
			Scan(&rawTrend).Error

		if err == nil && len(rawTrend) > 0 {
			type tKey struct {
				Bulan     string
				IndexType string
			}
			type tGroup struct {
				Sum   float64
				Count int64
			}
			tMap := make(map[tKey]*tGroup)
			for _, rt := range rawTrend {
				k := tKey{Bulan: rt.Bulan, IndexType: rt.IndexType}
				if _, ok := tMap[k]; !ok {
					tMap[k] = &tGroup{}
				}
				g := tMap[k]
				g.Sum += float64(rt.RatingValue)
				g.Count++
			}
			for k, g := range tMap {
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
		}
	}

	return fiber.Map{
		"total_responses": totalResponses,
		"ipkp_score":      ipkpScore,
		"ipak_score":      ipakScore,
		"by_service":      byServiceList,
		"unsur_summary":   unsurList,
		"demographics":    demoList,
		"index_summary":   indexSummary,
		"trend":           trendList,
	}, nil
}





func (s *SurveyService) SubmitSurvey(req *domain.SubmitSurveyRequest, clientIP string) (uuid.UUID, error) {
	activePeriod, err := s.repo.GetActivePeriod()
	if err != nil {
		return uuid.Nil, fiber.NewError(fiber.StatusBadRequest, "Tidak ada periode survei aktif saat ini")
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

	// 2. Pre-fetch all active questions in 1 query to avoid N+1 queries in loop
	allQuestions, err := s.repo.ListActiveQuestions()
	if err != nil {
		tx.Rollback()
		return uuid.Nil, fiber.NewError(fiber.StatusInternalServerError, "Gagal memuat pertanyaan survei")
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
		s.repo.WriteAuditLog(&models.AuditLog{
			UserEmail:  "system@kemenag.go.id",
			Action:     "SUBMIT_SURVEY",
			EntityName: "Response",
			EntityID:   rID.String(),
		})
	}(resp.ID)



	return resp.ID, nil
}

