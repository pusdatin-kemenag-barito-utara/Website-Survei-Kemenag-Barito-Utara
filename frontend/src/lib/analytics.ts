/**
 * SI-ARUS - Google Analytics 4 (GA4) & Google Tag Helper
 * Measurement ID: G-9NHN42QQQ1 | Google Tag: GT-TQVWLP5V
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = import.meta.env.PUBLIC_GA_MEASUREMENT_ID || "";
export const GTAG_ID = import.meta.env.PUBLIC_GTAG_ID || "";

/**
 * Generic safe event dispatcher to GA4 / GTAG
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, {
      ...params,
      send_to: GA_MEASUREMENT_ID,
    });
  }
}

/**
 * Specific Business Tracking Events for SI-ARUS Kemenag Barito Utara
 */
export const Analytics = {
  // Pageview tracking
  pageView(url: string, title?: string) {
    trackEvent("page_view", {
      page_location: url,
      page_path: typeof window !== "undefined" ? window.location.pathname + window.location.search : url,
      page_title: title || (typeof document !== "undefined" ? document.title : "SI-ARUS"),
    });
  },

  // Survey Flow
  surveyStart(layananId?: string, layananNama?: string) {
    trackEvent("survey_start", {
      layanan_id: layananId || "general",
      layanan_nama: layananNama || "Umum",
      event_category: "Survey",
    });
  },

  surveyStep(stepIndex: number, stepName: string) {
    trackEvent("survey_step", {
      step_index: stepIndex,
      step_name: stepName,
      event_category: "Survey",
    });
  },

  surveySubmit(layananId?: string, respondentCount?: number) {
    trackEvent("survey_submit", {
      layanan_id: layananId || "general",
      respondent_count: respondentCount || 1,
      event_category: "Conversion",
      event_label: "Survei Selesai Dikirim",
    });
  },

  // Public Results & Data Explorer
  viewResults(category: "ipkp" | "ipak" | "all", period?: string, year?: number) {
    trackEvent("view_results", {
      result_category: category,
      period: period || "all",
      year: year || new Date().getFullYear(),
      event_category: "Engagement",
    });
  },

  // Report Export (PDF, Excel)
  exportReport(format: "pdf" | "excel", reportType: string, period?: string) {
    trackEvent("export_report", {
      file_format: format,
      report_type: reportType,
      period: period || "current",
      event_category: "Export",
    });
  },

  // QR Barcode Interaction
  downloadQrCode(serviceName?: string) {
    trackEvent("download_qr", {
      service_name: serviceName || "General",
      event_category: "Download",
    });
  },

  // Language Switching
  switchLanguage(locale: "id" | "en") {
    trackEvent("switch_language", {
      selected_language: locale,
      event_category: "Localization",
    });
  },

  // Admin Access & Authentication
  adminLogin(status: "success" | "failed", email?: string) {
    trackEvent("admin_login", {
      login_status: status,
      admin_email: email || "masked",
      event_category: "Security",
    });
  },
};
