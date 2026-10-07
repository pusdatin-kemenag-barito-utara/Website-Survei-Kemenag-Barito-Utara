package domain

import (
	"crypto/md5"
	"encoding/hex"
	"strings"
	"sync"

	"github.com/google/uuid"
)

var (
	idMapMu  sync.RWMutex
	uuidToPb = make(map[string]string)
	pbToUUID = make(map[string]uuid.UUID)
)

// RegisterIDMapping registers a known bidirectional mapping between a 15-char PB ID and a UUID
func RegisterIDMapping(pbID string, u uuid.UUID) {
	if pbID == "" || u == uuid.Nil {
		return
	}
	idMapMu.Lock()
	defer idMapMu.Unlock()
	uuidToPb[strings.ToLower(u.String())] = pbID
	pbToUUID[pbID] = u
}

// UUIDToPbID converts any string (UUID or legacy key) to a 15-char PocketBase ID deterministically
func UUIDToPbID(u string) string {
	cleaned := strings.ToLower(strings.TrimSpace(u))
	if cleaned == "" {
		return ""
	}
	// If already a 15-char alphanumeric PB ID, return directly
	if len(cleaned) == 15 && !strings.Contains(cleaned, "-") {
		return cleaned
	}
	idMapMu.RLock()
	if pbID, ok := uuidToPb[cleaned]; ok {
		idMapMu.RUnlock()
		return pbID
	}
	idMapMu.RUnlock()

	hash := md5.Sum([]byte(cleaned))
	return hex.EncodeToString(hash[:])[:15]
}

// PbIDToUUID converts a 15-char PocketBase ID to a deterministic UUIDv5
func PbIDToUUID(id string) uuid.UUID {
	cleaned := strings.TrimSpace(id)
	if u, err := uuid.Parse(cleaned); err == nil {
		return u
	}
	if cleaned == "" {
		return uuid.Nil
	}

	idMapMu.RLock()
	if u, ok := pbToUUID[cleaned]; ok {
		idMapMu.RUnlock()
		return u
	}
	idMapMu.RUnlock()

	u := uuid.NewSHA1(uuid.NameSpaceDNS, []byte(cleaned))
	RegisterIDMapping(cleaned, u)
	return u
}
