package database

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"

	"survey-kemenag-backend/config"
)

type PocketBaseClient struct {
	BaseURL       string
	AdminEmail    string
	AdminPassword string
	Token         string
	tokenMu       sync.RWMutex
	httpClient    *http.Client
	healthClient  *http.Client
	healthMu      sync.RWMutex
	lastHealthOK  bool
	lastLatency   float64
	lastHealthAt  time.Time
}

var PB *PocketBaseClient

func NewPocketBaseClient(baseURL, adminEmail, adminPassword string) *PocketBaseClient {
	return &PocketBaseClient{
		BaseURL:       baseURL,
		AdminEmail:    adminEmail,
		AdminPassword: adminPassword,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        50,
				MaxIdleConnsPerHost: 20,
				IdleConnTimeout:     90 * time.Second,
			},
		},
		healthClient: &http.Client{
			Timeout: 3 * time.Second,
		},
	}
}

func ConnectPocketBase(cfg *config.Config) error {
	pbURL := cfg.PocketBaseURL
	if pbURL == "" {
		return fmt.Errorf("POCKETBASE_URL is not set")
	}
	email := cfg.PocketBaseAdminEmail
	password := cfg.PocketBaseAdminPassword

	PB = NewPocketBaseClient(pbURL, email, password)
	if email != "" && password != "" {
		if err := PB.Authenticate(); err != nil {
			log.Printf("⚠️ Warning: Failed initial PocketBase admin auth: %v (will retry on demand)", err)
		} else {
			log.Println("✅ Successfully connected and authenticated to PocketBase Database at", pbURL)
			go AutoSeedPocketBase(PB)
		}
	} else {
		log.Println("ℹ️ PocketBase client initialized without admin credentials (public mode) at", pbURL)
	}

	// Warm-up initial health check
	go PB.checkHealth()

	// Periodic background health check (every 5 seconds) to ensure /health responds instantaneously
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			if PB != nil {
				PB.checkHealth()
			}
		}
	}()

	return nil
}

func (c *PocketBaseClient) Authenticate() error {
	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()

	payload := map[string]string{
		"identity": c.AdminEmail,
		"password": c.AdminPassword,
	}
	bodyBytes, _ := json.Marshal(payload)

	reqURL := fmt.Sprintf("%s/api/collections/_superusers/auth-with-password", c.BaseURL)
	req, err := http.NewRequest(http.MethodPost, reqURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("pocketbase auth returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var authResp struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
		return err
	}

	c.Token = authResp.Token
	return nil
}

func (c *PocketBaseClient) getToken() string {
	c.tokenMu.RLock()
	defer c.tokenMu.RUnlock()
	return c.Token
}

func (c *PocketBaseClient) doRequest(method, endpoint string, query url.Values, body interface{}, out interface{}, retryAuth bool) error {
	fullURL := fmt.Sprintf("%s%s", c.BaseURL, endpoint)
	if len(query) > 0 {
		fullURL += "?" + query.Encode()
	}

	var bodyReader io.Reader
	if body != nil {
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			return err
		}
		bodyReader = bytes.NewReader(bodyBytes)
	}

	req, err := http.NewRequest(method, fullURL, bodyReader)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	token := c.getToken()
	if token != "" {
		req.Header.Set("Authorization", token)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// If 401 Unauthorized and retryAuth is true, refresh token and try again
	if resp.StatusCode == http.StatusUnauthorized && retryAuth {
		if err := c.Authenticate(); err == nil {
			return c.doRequest(method, endpoint, query, body, out, false)
		}
	}

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("pocketbase API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	if out != nil && resp.StatusCode != http.StatusNoContent {
		return json.NewDecoder(resp.Body).Decode(out)
	}

	return nil
}

func (c *PocketBaseClient) Get(endpoint string, query url.Values, out interface{}) error {
	return c.doRequest(http.MethodGet, endpoint, query, nil, out, true)
}

func (c *PocketBaseClient) Post(endpoint string, body interface{}, out interface{}) error {
	return c.doRequest(http.MethodPost, endpoint, nil, body, out, true)
}

func (c *PocketBaseClient) Patch(endpoint string, body interface{}, out interface{}) error {
	return c.doRequest(http.MethodPatch, endpoint, nil, body, out, true)
}

func (c *PocketBaseClient) Delete(endpoint string) error {
	return c.doRequest(http.MethodDelete, endpoint, nil, nil, nil, true)
}

func (c *PocketBaseClient) checkHealth() (bool, float64, error) {
	start := time.Now()
	resp, err := c.healthClient.Get(fmt.Sprintf("%s/api/health", c.BaseURL))
	latency := float64(time.Since(start).Microseconds()) / 1000.0

	c.healthMu.Lock()
	defer c.healthMu.Unlock()
	c.lastHealthAt = time.Now()

	if err != nil {
		c.lastHealthOK = false
		c.lastLatency = latency
		return false, latency, err
	}
	defer resp.Body.Close()

	c.lastHealthOK = (resp.StatusCode == http.StatusOK)
	c.lastLatency = latency
	return c.lastHealthOK, latency, nil
}

func (c *PocketBaseClient) Health() (bool, float64, error) {
	c.healthMu.RLock()
	// Return cached status immediately if checked within the last 10 seconds (instant sub-millisecond response)
	if time.Since(c.lastHealthAt) < 10*time.Second && !c.lastHealthAt.IsZero() {
		ok := c.lastHealthOK
		latency := c.lastLatency
		c.healthMu.RUnlock()
		return ok, latency, nil
	}
	c.healthMu.RUnlock()

	return c.checkHealth()
}

func (c *PocketBaseClient) AuthWithPassword(collection, identity, password string) (bool, string, error) {
	payload := map[string]string{
		"identity": identity,
		"password": password,
	}
	bodyBytes, _ := json.Marshal(payload)
	reqURL := fmt.Sprintf("%s/api/collections/%s/auth-with-password", c.BaseURL, collection)
	req, err := http.NewRequest(http.MethodPost, reqURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return false, "", err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return false, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		var authResp struct {
			Token string `json:"token"`
			Record struct {
				ID string `json:"id"`
			} `json:"record"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&authResp)
		return true, authResp.Record.ID, nil
	}
	return false, "", nil
}

