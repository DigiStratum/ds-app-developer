package featureflags

import (
	"context"
	"errors"
)

// MockStore implements FlagStore for testing
type MockStore struct {
	flags     map[string]*FeatureFlag
	getErr    error
	listErr   error
	saveErr   error
	deleteErr error
	getCalls  int
	listCalls int
	saveCalls int
	deleteCalls int
}

// NewMockStore creates a new MockStore with no flags
func NewMockStore() *MockStore {
	return &MockStore{
		flags: make(map[string]*FeatureFlag),
	}
}

// Get implements FlagStore.Get
func (m *MockStore) Get(ctx context.Context, key string) (*FeatureFlag, error) {
	m.getCalls++
	if m.getErr != nil {
		return nil, m.getErr
	}
	flag, ok := m.flags[key]
	if !ok {
		return nil, nil
	}
	return flag, nil
}

// List implements FlagStore.List
func (m *MockStore) List(ctx context.Context) ([]*FeatureFlag, error) {
	m.listCalls++
	if m.listErr != nil {
		return nil, m.listErr
	}
	result := make([]*FeatureFlag, 0, len(m.flags))
	for _, flag := range m.flags {
		result = append(result, flag)
	}
	return result, nil
}

// Save implements FlagStore.Save
func (m *MockStore) Save(ctx context.Context, flag *FeatureFlag) error {
	m.saveCalls++
	if m.saveErr != nil {
		return m.saveErr
	}
	m.flags[flag.Key] = flag
	return nil
}

// Delete implements FlagStore.Delete
func (m *MockStore) Delete(ctx context.Context, key string) error {
	m.deleteCalls++
	if m.deleteErr != nil {
		return m.deleteErr
	}
	delete(m.flags, key)
	return nil
}

// InvalidateCache implements FlagStore.InvalidateCache
func (m *MockStore) InvalidateCache() {
	// No-op for mock
}

// AddFlag is a test helper to add a flag to the mock store
func (m *MockStore) AddFlag(flag *FeatureFlag) {
	m.flags[flag.Key] = flag
}

// SetGetError sets an error to be returned by Get
func (m *MockStore) SetGetError(err error) {
	m.getErr = err
}

// SetListError sets an error to be returned by List
func (m *MockStore) SetListError(err error) {
	m.listErr = err
}

// SetSaveError sets an error to be returned by Save
func (m *MockStore) SetSaveError(err error) {
	m.saveErr = err
}

// SetDeleteError sets an error to be returned by Delete
func (m *MockStore) SetDeleteError(err error) {
	m.deleteErr = err
}

// Reset resets the mock store to initial state
func (m *MockStore) Reset() {
	m.flags = make(map[string]*FeatureFlag)
	m.getErr = nil
	m.listErr = nil
	m.saveErr = nil
	m.deleteErr = nil
	m.getCalls = 0
	m.listCalls = 0
	m.saveCalls = 0
	m.deleteCalls = 0
}

// Ensure MockStore implements FlagStore
var _ FlagStore = (*MockStore)(nil)

// Common test errors
var (
	errMockStorage = errors.New("mock storage error")
)
