package featureflags

import "context"

// FlagStore defines the interface for feature flag storage operations.
// This interface enables testing without requiring DynamoDB.
type FlagStore interface {
	// Get retrieves a feature flag by key. Returns nil if not found.
	Get(ctx context.Context, key string) (*FeatureFlag, error)

	// List returns all feature flags.
	List(ctx context.Context) ([]*FeatureFlag, error)

	// Save creates or updates a feature flag.
	Save(ctx context.Context, flag *FeatureFlag) error

	// Delete removes a feature flag.
	Delete(ctx context.Context, key string) error

	// InvalidateCache clears the in-memory cache.
	InvalidateCache()
}

// Ensure Store implements FlagStore
var _ FlagStore = (*Store)(nil)
