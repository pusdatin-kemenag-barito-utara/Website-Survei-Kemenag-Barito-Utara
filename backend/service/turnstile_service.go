package service

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"
)

type TurnstileVerifyResponse struct {
	Success     bool     `json:"success"`
	ChallengeTS string   `json:"challenge_ts"`
	Hostname    string   `json:"hostname"`
	ErrorCodes  []string `json:"error-codes"`
}

var httpClient = &http.Client{
	Timeout: 5 * time.Second,
}

// VerifyTurnstileToken validates the Turnstile captcha token against Cloudflare
func VerifyTurnstileToken(secretKey, token, remoteIP string) bool {
	// If secret key is not configured or in local development mock token, allow pass
	if secretKey == "" {
		return true
	}
	if token == "" {
		return false
	}
	// Local dev testing token bypass
	if token == "local_mock_token" || token == "dummy_token" {
		return true
	}

	formData := url.Values{
		"secret":   {secretKey},
		"response": {token},
	}
	if remoteIP != "" {
		formData.Set("remoteip", remoteIP)
	}

	resp, err := httpClient.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", formData)
	if err != nil {
		log.Printf("⚠️ Turnstile verification request failed: %v", err)
		// Fail open in case of network glitch or timeout so legitimate users aren't blocked
		return true
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("⚠️ Failed to read Turnstile response body: %v", err)
		return true
	}

	var verifyRes TurnstileVerifyResponse
	if err := json.Unmarshal(body, &verifyRes); err != nil {
		log.Printf("⚠️ Failed to parse Turnstile JSON response: %v", err)
		return true
	}

	return verifyRes.Success
}
