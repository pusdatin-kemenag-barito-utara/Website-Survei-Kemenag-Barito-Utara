package repository

import (
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"survey-kemenag-backend/database"

	"gorm.io/gorm"
)

type pbCacheEntry struct {
	data      interface{}
	expiresAt time.Time
}

type pocketbaseRepository struct {
	pb       *database.PocketBaseClient
	cacheMu  sync.RWMutex
	cacheMap map[string]pbCacheEntry
}

// NewPocketBaseRepository constructs a repository backed by PocketBase REST API
func NewPocketBaseRepository(pb *database.PocketBaseClient) Repository {
	return &pocketbaseRepository{
		pb:       pb,
		cacheMap: make(map[string]pbCacheEntry),
	}
}

func (r *pocketbaseRepository) getMemCache(key string) (interface{}, bool) {
	r.cacheMu.RLock()
	defer r.cacheMu.RUnlock()
	entry, ok := r.cacheMap[key]
	if !ok || time.Now().After(entry.expiresAt) {
		return nil, false
	}
	return entry.data, true
}

func (r *pocketbaseRepository) setMemCache(key string, data interface{}, ttl time.Duration) {
	r.cacheMu.Lock()
	defer r.cacheMu.Unlock()
	if r.cacheMap == nil {
		r.cacheMap = make(map[string]pbCacheEntry)
	}
	r.cacheMap[key] = pbCacheEntry{
		data:      data,
		expiresAt: time.Now().Add(ttl),
	}
}

func (r *pocketbaseRepository) invalidateMemCache(prefix string) {
	r.cacheMu.Lock()
	defer r.cacheMu.Unlock()
	if prefix == "" {
		r.cacheMap = make(map[string]pbCacheEntry)
		return
	}
	for k := range r.cacheMap {
		if strings.HasPrefix(k, prefix) {
			delete(r.cacheMap, k)
		}
	}
}

func (r *pocketbaseRepository) DB() *gorm.DB {
	return nil
}

// pbRecordList represents PocketBase paginated record response
type pbRecordList struct {
	Page       int                      `json:"page"`
	PerPage    int                      `json:"perPage"`
	TotalItems int64                    `json:"totalItems"`
	TotalPages int                      `json:"totalPages"`
	Items      []map[string]interface{} `json:"items"`
}

// Data parsing helper utilities
func parseTime(raw interface{}) time.Time {
	if raw == nil {
		return time.Now()
	}
	s, ok := raw.(string)
	if !ok || s == "" {
		return time.Now()
	}
	formats := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05.999Z",
		"2006-01-02 15:04:05Z",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t
		}
	}
	return time.Now()
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok && v != nil {
		return fmt.Sprintf("%v", v)
	}
	return ""
}

func getBool(m map[string]interface{}, key string) bool {
	if v, ok := m[key]; ok && v != nil {
		if b, ok := v.(bool); ok {
			return b
		}
		if s, ok := v.(string); ok {
			return s == "true" || s == "1"
		}
		if n, ok := v.(float64); ok {
			return n == 1
		}
	}
	return false
}

func getInt(m map[string]interface{}, key string) int {
	if v, ok := m[key]; ok && v != nil {
		if n, ok := v.(float64); ok {
			return int(n)
		}
		if n, ok := v.(int); ok {
			return n
		}
		if s, ok := v.(string); ok {
			if n, err := strconv.Atoi(s); err == nil {
				return n
			}
		}
	}
	return 0
}

func getFloat(m map[string]interface{}, key string) float64 {
	if v, ok := m[key]; ok && v != nil {
		if n, ok := v.(float64); ok {
			return n
		}
		if s, ok := v.(string); ok {
			if n, err := strconv.ParseFloat(s, 64); err == nil {
				return n
			}
		}
	}
	return 0
}
