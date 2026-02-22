// Package secrets provides AWS Secrets Manager helpers with caching.
package secrets

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

// cache stores secrets with sync.Once for concurrent-safe lazy loading
var (
	mu     sync.RWMutex
	cache  = make(map[string]*cachedSecret)
	client *secretsmanager.Client
)

type cachedSecret struct {
	value string
	once  sync.Once
	err   error
}

// Get retrieves a secret value, caching it for subsequent calls.
// Uses sync.Once to ensure the secret is only loaded once even under concurrent access.
func Get(ctx context.Context, secretName string) (string, error) {
	mu.RLock()
	cached, exists := cache[secretName]
	mu.RUnlock()

	if !exists {
		mu.Lock()
		// Double-check after acquiring write lock
		if cached, exists = cache[secretName]; !exists {
			cached = &cachedSecret{}
			cache[secretName] = cached
		}
		mu.Unlock()
	}

	// Load the secret (only once)
	cached.once.Do(func() {
		cached.value, cached.err = fetchSecret(ctx, secretName)
	})

	return cached.value, cached.err
}

// GetJSON retrieves a secret and unmarshals it into the provided struct.
func GetJSON(ctx context.Context, secretName string, v interface{}) error {
	value, err := Get(ctx, secretName)
	if err != nil {
		return err
	}
	return json.Unmarshal([]byte(value), v)
}

// Invalidate removes a secret from the cache, forcing it to be reloaded on next access.
func Invalidate(secretName string) {
	mu.Lock()
	delete(cache, secretName)
	mu.Unlock()
}

// Clear removes all secrets from the cache.
func Clear() {
	mu.Lock()
	cache = make(map[string]*cachedSecret)
	mu.Unlock()
}

func getClient(ctx context.Context) (*secretsmanager.Client, error) {
	if client != nil {
		return client, nil
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client = secretsmanager.NewFromConfig(cfg)
	return client, nil
}

func fetchSecret(ctx context.Context, secretName string) (string, error) {
	c, err := getClient(ctx)
	if err != nil {
		return "", err
	}

	result, err := c.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: &secretName,
	})
	if err != nil {
		return "", fmt.Errorf("failed to get secret %s: %w", secretName, err)
	}

	if result.SecretString != nil {
		return *result.SecretString, nil
	}

	return "", fmt.Errorf("secret %s has no string value", secretName)
}
