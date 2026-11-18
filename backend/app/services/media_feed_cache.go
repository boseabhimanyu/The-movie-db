package services

import (
	"sync"
	"time"
)

type feedCacheEntry[T any] struct {
	value     T
	expiresAt time.Time
}

type feedCache[T any] struct {
	mu      sync.RWMutex
	entries map[string]feedCacheEntry[T]
	ttl     time.Duration
	maxKeys int
}

func newFeedCache[T any](ttl time.Duration) *feedCache[T] {
	if ttl <= 0 {
		ttl = 15 * time.Minute
	}
	return &feedCache[T]{
		entries: make(map[string]feedCacheEntry[T]),
		ttl:     ttl,
		maxKeys: 200,
	}
}

func (c *feedCache[T]) Get(key string) (T, bool) {
	c.mu.RLock()
	entry, ok := c.entries[key]
	c.mu.RUnlock()

	if !ok {
		var zero T
		return zero, false
	}
	if time.Now().After(entry.expiresAt) {
		c.mu.Lock()
		delete(c.entries, key)
		c.mu.Unlock()
		var zero T
		return zero, false
	}

	return entry.value, true
}

func (c *feedCache[T]) Set(key string, value T) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.entries) >= c.maxKeys {
		now := time.Now()
		for k, v := range c.entries {
			if now.After(v.expiresAt) {
				delete(c.entries, k)
			}
		}
		if len(c.entries) >= c.maxKeys {
			for k := range c.entries {
				delete(c.entries, k)
				if len(c.entries) < c.maxKeys/2 {
					break
				}
			}
		}
	}

	c.entries[key] = feedCacheEntry[T]{
		value:     value,
		expiresAt: time.Now().Add(c.ttl),
	}
}

func (c *feedCache[T]) Clear() {
	c.mu.Lock()
	c.entries = make(map[string]feedCacheEntry[T])
	c.mu.Unlock()
}
