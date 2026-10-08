package database

import (
	"log"
	"net/url"
)

type pbListResponse struct {
	TotalItems int                      `json:"totalItems"`
	Items      []map[string]interface{} `json:"items"`
}

// AutoSeedPocketBase checks if critical collections (unsur, questions, demographics)
// are empty, and seeds standard government survey data compliant with Permenpan-RB.
func AutoSeedPocketBase(c *PocketBaseClient) {
	if c == nil || c.getToken() == "" {
		return
	}

	log.Println("🔍 [AutoSeeder] Checking PocketBase initial data integrity...")

	// 1. Check Unsur (Ensure 9 IPKP + 5 IPAK)
	var unsurList pbListResponse
	qUnsur := url.Values{}
	qUnsur.Set("perPage", "100")
	if err := c.Get("/api/collections/unsur/records", qUnsur, &unsurList); err != nil {
		log.Printf("⚠️ [AutoSeeder] Failed to check unsur records: %v", err)
		return
	}

	unsurMap := make(map[string]string) // name -> pbID
	hasIPAK := false
	for _, item := range unsurList.Items {
		name, _ := item["name"].(string)
		id, _ := item["id"].(string)
		idxType, _ := item["index_type"].(string)
		if name != "" && id != "" {
			unsurMap[name] = id
		}
		if idxType == "IPAK" {
			hasIPAK = true
		}
	}

	// Seed 5 IPAK unsur if missing
	if !hasIPAK {
		log.Println("🌱 [AutoSeeder] Seeding 5 IPAK Unsur...")
		ipakList := []struct {
			name        string
			description string
			sortOrder   int
		}{
			{"Percaloan/Perantara Tidak Resmi", "Ada tidaknya perantara tidak resmi dalam pengurusan layanan", 1},
			{"Pungutan Liar (Pungli)", "Ada tidaknya pungutan liar di luar ketentuan resmi", 2},
			{"Pemberian Imbalan/ Gratifikasi", "Ada tidaknya permintaan atau penerimaan imbalan/hadiah", 3},
			{"Diskriminasi Pelayanan", "Ada tidaknya perlakuan diskriminasi atau perlakuan khusus tidak wajar", 4},
			{"Praktek Suap/Korupsi", "Ada tidaknya indikasi atau ajakan kompromi suap", 5},
		}

		for _, ipak := range ipakList {
			payload := map[string]interface{}{
				"index_type":  "IPAK",
				"name":        ipak.name,
				"description": ipak.description,
				"sort_order":  ipak.sortOrder,
				"is_active":   true,
			}
			var created map[string]interface{}
			if err := c.Post("/api/collections/unsur/records", payload, &created); err == nil {
				if newID, ok := created["id"].(string); ok {
					unsurMap[ipak.name] = newID
				}
			}
		}
	}

	// Re-fetch unsur if we added new ones
	if !hasIPAK {
		_ = c.Get("/api/collections/unsur/records", qUnsur, &unsurList)
		for _, item := range unsurList.Items {
			name, _ := item["name"].(string)
			id, _ := item["id"].(string)
			if name != "" && id != "" {
				unsurMap[name] = id
			}
		}
	}

	// 2. Check Questions
	var qList pbListResponse
	qParams := url.Values{}
	qParams.Set("perPage", "10")
	if err := c.Get("/api/collections/questions/records", qParams, &qList); err == nil {
		if qList.TotalItems == 0 {
			log.Println("🌱 [AutoSeeder] Questions collection is empty! Seeding standard questions for each Unsur...")
			seedQuestions(c, unsurMap)
		} else {
			log.Printf("ℹ️ [AutoSeeder] Questions collection already has %d records. Skipping seeding.", qList.TotalItems)
		}
	}

	// 3. Check Demographic Fields
	var demoList pbListResponse
	dParams := url.Values{}
	dParams.Set("perPage", "10")
	if err := c.Get("/api/collections/demographic_fields/records", dParams, &demoList); err == nil {
		if demoList.TotalItems == 0 {
			log.Println("🌱 [AutoSeeder] Demographic fields collection is empty! Seeding default fields and options...")
			seedDemographics(c)
		} else {
			log.Printf("ℹ️ [AutoSeeder] Demographic fields collection already has %d records.", demoList.TotalItems)
		}
	}
}

func seedQuestions(c *PocketBaseClient, unsurMap map[string]string) {
	type questionSeed struct {
		unsurName string
		textID    string
		textEN    string
		order     int
		labels    map[string]string
	}

	defaultIPKPLabels := map[string]string{
		"1": "Tidak Puas",
		"2": "Kurang Puas",
		"3": "Puas",
		"4": "Sangat Puas",
	}

	defaultIPAKLabels := map[string]string{
		"1": "Sangat Sering",
		"2": "Sering",
		"3": "Jarang",
		"4": "Tidak Pernah",
	}

	seeds := []questionSeed{
		// 9 IPKP Unsur
		{"Persyaratan", "Bagaimana pendapat Saudara/i tentang kesesuaian persyaratan pelayanan dengan jenis pelayanannya?", "What is your opinion regarding the suitability of service requirements?", 1, defaultIPKPLabels},
		{"Prosedur", "Bagaimana pendapat Saudara/i tentang kemudahan prosedur dan alur pelayanan di unit ini?", "What is your opinion regarding the ease of service procedures in this unit?", 2, defaultIPKPLabels},
		{"Waktu Pelayanan", "Bagaimana pendapat Saudara/i tentang kecepatan waktu dalam penyelesaian pemberian pelayanan?", "What is your opinion regarding the speed of service completion?", 3, defaultIPKPLabels},
		{"Biaya/Tarif", "Bagaimana pendapat Saudara/i tentang kesesuaian biaya/tarif pelayanan (gratis/sesuai ketentuan)?", "What is your opinion regarding the fairness of service fees/rates?", 4, defaultIPKPLabels},
		{"Produk Spesifikasi Jenis Pelayanan", "Bagaimana pendapat Saudara/i tentang kesesuaian hasil produk pelayanan yang diterima dengan standar?", "What is your opinion regarding the conformity of service output with the standards?", 5, defaultIPKPLabels},
		{"Kompetensi Pelaksana", "Bagaimana pendapat Saudara/i tentang kemampuan, keahlian, dan ketanggapan petugas pelayanan?", "What is your opinion regarding the competence and skills of service officers?", 6, defaultIPKPLabels},
		{"Perilaku Pelaksana", "Bagaimana pendapat Saudara/i tentang sikap dan perilaku petugas terkait keramahan dan kesopanan?", "What is your opinion regarding the politeness and friendliness of officers?", 7, defaultIPKPLabels},
		{"Penanganan Pengaduan, Saran dan Masukan", "Bagaimana pendapat Saudara/i tentang penanganan dan respon tindak lanjut pengaduan atau saran?", "What is your opinion regarding the handling of complaints and suggestions?", 8, defaultIPKPLabels},
		{"Sarana dan Prasarana", "Bagaimana pendapat Saudara/i tentang kenyamanan, kebersihan, dan fasilitas sarana prasarana pelayanan?", "What is your opinion regarding the quality and comfort of service facilities?", 9, defaultIPKPLabels},

		// 5 IPAK Unsur
		{"Percaloan/Perantara Tidak Resmi", "Apakah Saudara/i menemukan adanya praktek percaloan atau perantara tidak resmi dalam pelayanan ini?", "Did you find any unofficial broker or intermediary practices in this service?", 10, defaultIPAKLabels},
		{"Pungutan Liar (Pungli)", "Apakah ada pungutan liar (pungli) atau biaya tambahan tidak resmi yang diminta oleh petugas?", "Were there any illegal levies or extra unauthorized fees requested?", 11, defaultIPAKLabels},
		{"Pemberian Imbalan/ Gratifikasi", "Apakah petugas meminta atau mengisyaratkan pemberian imbalan, hadiah, atau gratifikasi?", "Did any officer request or hint at gratification or tips for the service?", 12, defaultIPAKLabels},
		{"Diskriminasi Pelayanan", "Apakah Saudara/i merasakan adanya diskriminasi atau perlakuan khusus yang tidak adil dalam pelayanan?", "Did you experience any discrimination or unfair special treatment during service?", 13, defaultIPAKLabels},
		{"Praktek Suap/Korupsi", "Apakah ada indikasi atau ajakan kompromi suap / kecurangan dalam pemberian pelayanan?", "Was there any indication of bribery or corrupt practices during service?", 14, defaultIPAKLabels},
	}

	count := 0
	for _, s := range seeds {
		unsurID, ok := unsurMap[s.unsurName]
		if !ok {
			// Try fuzzy match
			for name, id := range unsurMap {
				if len(name) > 3 && len(s.unsurName) > 3 && (name[:4] == s.unsurName[:4]) {
					unsurID = id
					break
				}
			}
		}
		if unsurID == "" {
			continue
		}

		payload := map[string]interface{}{
			"unsur":            unsurID,
			"question_text_id": s.textID,
			"question_text_en": s.textEN,
			"input_type":       "star_rating",
			"rating_labels":    s.labels,
			"is_active":        true,
			"sort_order":       s.order,
		}

		if err := c.Post("/api/collections/questions/records", payload, nil); err == nil {
			count++
		} else {
			log.Printf("⚠️ [AutoSeeder] Error inserting question for '%s': %v", s.unsurName, err)
		}
	}
	log.Printf("✅ [AutoSeeder] Successfully seeded %d questions into PocketBase!", count)
}

func seedDemographics(c *PocketBaseClient) {
	fields := []struct {
		key      string
		labelID  string
		labelEN  string
		order    int
		options  []struct{ val, id, en string }
	}{
		{
			key: "usia", labelID: "Usia", labelEN: "Age", order: 1,
			options: []struct{ val, id, en string }{
				{"17-25", "17 - 25 Tahun", "17 - 25 Years"},
				{"26-35", "26 - 35 Tahun", "26 - 35 Years"},
				{"36-45", "36 - 45 Tahun", "36 - 45 Years"},
				{"46-55", "46 - 55 Tahun", "46 - 55 Years"},
				{"56+", "56 Tahun ke Atas", "56 Years & Above"},
			},
		},
		{
			key: "jenis_kelamin", labelID: "Jenis Kelamin", labelEN: "Gender", order: 2,
			options: []struct{ val, id, en string }{
				{"L", "Laki-laki", "Male"},
				{"P", "Perempuan", "Female"},
			},
		},
		{
			key: "pendidikan", labelID: "Pendidikan Terakhir", labelEN: "Education", order: 3,
			options: []struct{ val, id, en string }{
				{"SD", "SD / Sederajat", "Elementary School"},
				{"SMP", "SMP / Sederajat", "Middle School"},
				{"SMA", "SMA / Sederajat", "High School"},
				{"D3", "D3 / Diploma", "Diploma (D3)"},
				{"S1", "S1 / Sarjana", "Bachelor (S1)"},
				{"S2", "S2 / Magister", "Master (S2)"},
				{"S3", "S3 / Doktor", "Doctorate (S3)"},
			},
		},
		{
			key: "pekerjaan", labelID: "Pekerjaan Utama", labelEN: "Occupation", order: 4,
			options: []struct{ val, id, en string }{
				{"PNS", "PNS / ASN", "Civil Servant"},
				{"PPPK", "PPPK", "PPPK"},
				{"TNI/Polri", "TNI / Polri", "Military/Police"},
				{"Swasta", "Pegawai Swasta", "Private Employee"},
				{"Wiraswasta", "Wiraswasta / Pedagang", "Entrepreneur"},
				{"Pelajar/Mahasiswa", "Pelajar / Mahasiswa", "Student"},
				{"Lainnya", "Lainnya", "Other"},
			},
		},
	}

	for _, f := range fields {
		fieldPayload := map[string]interface{}{
			"field_key":   f.key,
			"label_id":    f.labelID,
			"label_en":    f.labelEN,
			"field_type":  "select",
			"is_required": true,
			"sort_order":  f.order,
		}
		var createdField map[string]interface{}
		if err := c.Post("/api/collections/demographic_fields/records", fieldPayload, &createdField); err == nil {
			fieldID, _ := createdField["id"].(string)
			if fieldID != "" {
				for optIdx, opt := range f.options {
					optPayload := map[string]interface{}{
						"field":      fieldID,
						"value":      opt.val,
						"label_id":   opt.id,
						"label_en":   opt.en,
						"sort_order": optIdx + 1,
					}
					_ = c.Post("/api/collections/demographic_options/records", optPayload, nil)
				}
			}
		} else {
			log.Printf("⚠️ [AutoSeeder] Error inserting demographic field '%s': %v", f.key, err)
		}
	}
	log.Println("✅ [AutoSeeder] Successfully seeded demographic fields and options into PocketBase!")
}

