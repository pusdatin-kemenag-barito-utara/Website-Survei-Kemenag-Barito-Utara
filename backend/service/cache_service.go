package service

import (
	"crypto/sha256"
	"encoding/hex"
	"sync"
	"time"
)

type CacheItem struct {
	Value      interface{}
	Expiration time.Time
}

type MemoryCache struct {
	items map[string]CacheItem
	mu    sync.RWMutex
}

var globalCache = &MemoryCache{
	items: make(map[string]CacheItem),
}

func (c *MemoryCache) Set(key string, value interface{}, duration time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = CacheItem{
		Value:      value,
		Expiration: time.Now().Add(duration),
	}
}

func (c *MemoryCache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	item, exists := c.items[key]
	if !exists || time.Now().After(item.Expiration) {
		return nil, false
	}
	return item.Value, true
}

func (c *MemoryCache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, key)
}

func init() {
	// Background garbage collector for expired cache entries (every 5 minutes)
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			globalCache.PurgeExpired()
		}
	}()
}

func (c *MemoryCache) ClearAll() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]CacheItem)
}

func (c *MemoryCache) PurgeExpired() {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	for k, item := range c.items {
		if now.After(item.Expiration) {
			delete(c.items, k)
		}
	}
}

// Global Cache Helper functions
func SetCache(key string, value interface{}, duration time.Duration) {
	globalCache.Set(key, value, duration)
}

func GetCache(key string) (interface{}, bool) {
	return globalCache.Get(key)
}

func DeleteCache(key string) {
	globalCache.Delete(key)
}

func ClearCache() {
	globalCache.ClearAll()
}

// HashIP hashes IP Address with SHA-256 for privacy compliance (UU PDP)
func HashIP(ip string) string {
	if ip == "" {
		return ""
	}
	salt := "SIKAP_KEMENAG_PRIVACY_SALT_2026"
	hash := sha256.Sum256([]byte(ip + salt))
	return hex.EncodeToString(hash[:])
}
