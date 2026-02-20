package health

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestShallowCheck(t *testing.T) {
	resp := ShallowCheck()
	
	if resp.Status != StatusUp {
		t.Errorf("expected status up, got %s", resp.Status)
	}
	
	if resp.Version == "" {
		t.Error("expected version to be set")
	}
	
	if resp.Timestamp == "" {
		t.Error("expected timestamp to be set")
	}
	
	// Shallow check should not include dependencies or uptime
	if len(resp.Dependencies) > 0 {
		t.Error("shallow check should not include dependencies")
	}
	
	if resp.UptimePct != nil {
		t.Error("shallow check should not include uptime_pct")
	}
}

func TestDeepCheck(t *testing.T) {
	// Setup test server to act as a dependency
	testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "up"})
	}))
	defer testServer.Close()
	
	// Configure dependencies
	SetConfig(&Config{
		Dependencies: []DependencyConfig{
			{
				Name:      "test-service",
				URL:       testServer.URL,
				TimeoutMs: 1000,
				Critical:  false,
			},
		},
	})
	defer SetConfig(nil)
	
	ctx := context.Background()
	resp := DeepCheck(ctx)
	
	if resp.Status != StatusUp {
		t.Errorf("expected status up, got %s", resp.Status)
	}
	
	if resp.Uptime == "" {
		t.Error("deep check should include uptime")
	}
	
	if resp.UptimePct == nil {
		t.Error("deep check should include uptime_pct")
	}
	
	if len(resp.Dependencies) != 1 {
		t.Errorf("expected 1 dependency, got %d", len(resp.Dependencies))
	}
	
	if resp.Dependencies[0].Name != "test-service" {
		t.Errorf("expected dependency name test-service, got %s", resp.Dependencies[0].Name)
	}
	
	if resp.Dependencies[0].Status != StatusUp {
		t.Errorf("expected dependency status up, got %s", resp.Dependencies[0].Status)
	}
}

func TestCheckDependency_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	
	dep := DependencyConfig{
		Name:      "test",
		URL:       server.URL,
		TimeoutMs: 1000,
	}
	
	result := CheckDependency(context.Background(), dep)
	
	if result.Status != StatusUp {
		t.Errorf("expected status up, got %s", result.Status)
	}
	
	// Latency should be >= 0 (may be 0 on very fast local requests)
	if result.LatencyMs < 0 {
		t.Error("expected latency to be non-negative")
	}
}

func TestCheckDependency_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()
	
	dep := DependencyConfig{
		Name:      "test",
		URL:       server.URL,
		TimeoutMs: 1000,
	}
	
	result := CheckDependency(context.Background(), dep)
	
	if result.Status != StatusDown {
		t.Errorf("expected status down, got %s", result.Status)
	}
	
	if result.Message == "" {
		t.Error("expected error message")
	}
}

func TestCheckDependency_Timeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	
	dep := DependencyConfig{
		Name:      "test",
		URL:       server.URL,
		TimeoutMs: 50, // Very short timeout
	}
	
	result := CheckDependency(context.Background(), dep)
	
	if result.Status != StatusDown {
		t.Errorf("expected status down due to timeout, got %s", result.Status)
	}
}

func TestCheckDependency_ClientError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()
	
	dep := DependencyConfig{
		Name:      "test",
		URL:       server.URL,
		TimeoutMs: 1000,
	}
	
	result := CheckDependency(context.Background(), dep)
	
	if result.Status != StatusDegraded {
		t.Errorf("expected status degraded for 4xx, got %s", result.Status)
	}
}

func TestCheckDependenciesParallel(t *testing.T) {
	// Create multiple test servers
	server1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(50 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server1.Close()
	
	server2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(50 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server2.Close()
	
	deps := []DependencyConfig{
		{Name: "svc1", URL: server1.URL, TimeoutMs: 1000},
		{Name: "svc2", URL: server2.URL, TimeoutMs: 1000},
	}
	
	start := time.Now()
	results := CheckDependenciesParallel(context.Background(), deps)
	elapsed := time.Since(start)
	
	// Should complete in ~50ms (parallel), not ~100ms (sequential)
	if elapsed > 100*time.Millisecond {
		t.Errorf("expected parallel execution, took %v", elapsed)
	}
	
	if len(results) != 2 {
		t.Errorf("expected 2 results, got %d", len(results))
	}
}

func TestCalculateOverallStatus(t *testing.T) {
	tests := []struct {
		name     string
		results  []DependencyResult
		expected Status
	}{
		{
			name:     "empty results",
			results:  nil,
			expected: StatusUp,
		},
		{
			name: "all up",
			results: []DependencyResult{
				{Status: StatusUp},
				{Status: StatusUp},
			},
			expected: StatusUp,
		},
		{
			name: "one degraded",
			results: []DependencyResult{
				{Status: StatusUp},
				{Status: StatusDegraded},
			},
			expected: StatusDegraded,
		},
		{
			name: "critical down",
			results: []DependencyResult{
				{Status: StatusUp},
				{Status: StatusDown, Critical: true},
			},
			expected: StatusDown,
		},
		{
			name: "non-critical down",
			results: []DependencyResult{
				{Status: StatusUp},
				{Status: StatusDown, Critical: false},
			},
			expected: StatusDegraded,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status := CalculateOverallStatus(tt.results)
			if status != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, status)
			}
		})
	}
}

func TestCalculateLatencyMetrics(t *testing.T) {
	results := []DependencyResult{
		{LatencyMs: 10},
		{LatencyMs: 20},
		{LatencyMs: 30},
	}
	
	metrics := CalculateLatencyMetrics(results, 35)
	
	if metrics == nil {
		t.Fatal("expected metrics, got nil")
	}
	
	if metrics.TotalMs != 35 {
		t.Errorf("expected total 35ms, got %d", metrics.TotalMs)
	}
	
	if metrics.MinMs != 10 {
		t.Errorf("expected min 10ms, got %d", metrics.MinMs)
	}
	
	if metrics.MaxMs != 30 {
		t.Errorf("expected max 30ms, got %d", metrics.MaxMs)
	}
	
	if metrics.AvgMs != 20 {
		t.Errorf("expected avg 20ms, got %d", metrics.AvgMs)
	}
}

func TestCalculateLatencyMetrics_Empty(t *testing.T) {
	metrics := CalculateLatencyMetrics(nil, 0)
	
	if metrics != nil {
		t.Error("expected nil metrics for empty results")
	}
}

func TestHandler_ShallowDefault(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	
	Handler(w, req)
	
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
	
	var resp HealthResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	
	if resp.Status != StatusUp {
		t.Errorf("expected status up, got %s", resp.Status)
	}
}

func TestHandler_ShallowExplicit(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health?depth=shallow", nil)
	w := httptest.NewRecorder()
	
	Handler(w, req)
	
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestHandler_DeepUnauthorized(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health?depth=deep", nil)
	w := httptest.NewRecorder()
	
	Handler(w, req)
	
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestHandler_DeepWithM2MToken(t *testing.T) {
	// Set M2M token
	t.Setenv("HEALTH_M2M_TOKEN", "test-m2m-token")
	
	req := httptest.NewRequest(http.MethodGet, "/health?depth=deep", nil)
	req.Header.Set("Authorization", "Bearer test-m2m-token")
	w := httptest.NewRecorder()
	
	Handler(w, req)
	
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
	
	var resp HealthResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	
	// Deep check includes additional fields
	if resp.Uptime == "" {
		t.Error("deep check should include uptime")
	}
}

func TestHandler_InvalidDepth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health?depth=invalid", nil)
	w := httptest.NewRecorder()
	
	Handler(w, req)
	
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}
