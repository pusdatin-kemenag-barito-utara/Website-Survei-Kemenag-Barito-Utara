package handlers

import (
	"fmt"
	"time"
	"survey-kemenag-backend/service"

	"github.com/gofiber/fiber/v2"
	"github.com/xuri/excelize/v2"
)


type ExportHandler struct {
	surveyService *service.SurveyService
}

func NewExportHandler(surveyService *service.SurveyService) *ExportHandler {
	return &ExportHandler{surveyService: surveyService}
}

func (h *ExportHandler) ExportResponsesExcel(c *fiber.Ctx) error {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	archiveData, err := h.surveyService.GetArchiveResults(startDate, endDate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	f := excelize.NewFile()
	defer f.Close()

	sheet := "Laporan Rekapitulasi"
	index, _ := f.NewSheet(sheet)
	f.DeleteSheet("Sheet1")


	// Header Styling
	styleHeader, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "FFFFFF", Size: 11},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"047857"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	// Title Block
	f.SetCellValue(sheet, "A1", "LAPORAN REKAPITULASI SURVEI KEPUASAN MASYARAKAT (SI-ARUS)")
	f.SetCellValue(sheet, "A2", fmt.Sprintf("KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA (Periode: %s s/d %s)", startDate, endDate))
	f.MergeCell(sheet, "A1", "E1")
	f.MergeCell(sheet, "A2", "E2")

	// Table Headers
	headers := []string{"NO", "NAMA LAYANAN", "NILAI INDEKS", "NILAI KONVERSI", "MUTU PELAYANAN"}
	cols := []string{"A", "B", "C", "D", "E"}
	for i, h := range headers {
		cell := fmt.Sprintf("%s4", cols[i])
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, styleHeader)
	}

	// Fill Data Rows
	rowIdx := 5
	if byService, ok := archiveData["by_service"]; ok {
		if serviceList, isList := byService.([]interface{}); isList {
			for idx, item := range serviceList {
				if sMap, ok := item.(map[string]interface{}); ok {
					f.SetCellValue(sheet, fmt.Sprintf("A%d", rowIdx), idx+1)
					f.SetCellValue(sheet, fmt.Sprintf("B%d", rowIdx), sMap["service_name"])
					f.SetCellValue(sheet, fmt.Sprintf("C%d", rowIdx), sMap["nilai_index"])
					f.SetCellValue(sheet, fmt.Sprintf("D%d", rowIdx), sMap["nilai_konversi"])
					f.SetCellValue(sheet, fmt.Sprintf("E%d", rowIdx), sMap["mutu"])
					rowIdx++
				}
			}
		}
	}

	f.SetActiveSheet(index)
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=Laporan-Survei-SI-ARUS-%s.xlsx", time.Now().Format("2006-01-02")))

	return f.Write(c.Response().BodyWriter())
}
