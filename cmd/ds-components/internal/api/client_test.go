package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// Tests the client can list components from the API
func TestClient_ListComponents(t *testing.T) {
	// Mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/components" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.Method != "GET" {
			t.Errorf("unexpected method: %s", r.Method)
		}

		response := ListComponentsResponse{
			Components: []*Component{
				{
					Name:          "test-component",
					Description:   "A test component",
					Author:        "test-author",
					LatestVersion: "1.0.0",
				},
			},
			Count: 1,
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := NewClient(server.URL, "", false)
	components, err := client.ListComponents(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(components) != 1 {
		t.Errorf("expected 1 component, got %d", len(components))
	}
	if components[0].Name != "test-component" {
		t.Errorf("expected name 'test-component', got %s", components[0].Name)
	}
}

// Tests the client can get a component with versions
func TestClient_GetComponent(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/components/my-component" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}

		response := ComponentWithVersions{
			Component: &Component{
				Name:          "my-component",
				Description:   "My component",
				LatestVersion: "2.0.0",
			},
			Versions: []*Version{
				{
					ComponentName: "my-component",
					Version:       "1.0.0",
					Size:          1024,
					Checksum:      "abc123",
					PublishedAt:   time.Now(),
				},
				{
					ComponentName: "my-component",
					Version:       "2.0.0",
					Size:          2048,
					Checksum:      "def456",
					PublishedAt:   time.Now(),
				},
			},
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := NewClient(server.URL, "", false)
	result, err := client.GetComponent(context.Background(), "my-component")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Component.Name != "my-component" {
		t.Errorf("expected name 'my-component', got %s", result.Component.Name)
	}
	if len(result.Versions) != 2 {
		t.Errorf("expected 2 versions, got %d", len(result.Versions))
	}
}

// Tests the client can register a new component
func TestClient_Register(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/components" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("unexpected method: %s", r.Method)
		}

		// Verify auth header
		if r.Header.Get("Authorization") != "Bearer test-token" {
			t.Errorf("expected auth header, got: %s", r.Header.Get("Authorization"))
		}

		var req RegisterRequest
		json.NewDecoder(r.Body).Decode(&req)

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(Component{
			Name:        req.Name,
			Description: req.Description,
			License:     req.License,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-token", false)
	result, err := client.Register(context.Background(), &RegisterRequest{
		Name:        "new-component",
		Description: "A new component",
		License:     "MIT",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Name != "new-component" {
		t.Errorf("expected name 'new-component', got %s", result.Name)
	}
}

// Tests the client handles API errors correctly
func TestClient_HandleErrors(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		errorCode  string
		errorMsg   string
	}{
		{"not found", 404, "NOT_FOUND", "Component not found"},
		{"conflict", 409, "CONFLICT", "Component already exists"},
		{"unauthorized", 401, "UNAUTHORIZED", "Authentication required"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.statusCode)
				json.NewEncoder(w).Encode(ErrorResponse{
					Error: struct {
						Code      string            `json:"code"`
						Message   string            `json:"message"`
						Details   map[string]string `json:"details,omitempty"`
						RequestID string            `json:"request_id,omitempty"`
					}{
						Code:    tt.errorCode,
						Message: tt.errorMsg,
					},
				})
			}))
			defer server.Close()

			client := NewClient(server.URL, "", false)
			_, err := client.GetComponent(context.Background(), "test")

			if err == nil {
				t.Error("expected error, got nil")
			}
			if err.Error() != tt.errorCode+": "+tt.errorMsg {
				t.Errorf("unexpected error message: %s", err.Error())
			}
		})
	}
}

// Tests checksum calculation
func TestCalculateChecksum(t *testing.T) {
	data := []byte("hello world")
	checksum := CalculateChecksum(data)

	// SHA256 of "hello world"
	expected := "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
	if checksum != expected {
		t.Errorf("expected checksum %s, got %s", expected, checksum)
	}
}

// Tests that checksum is consistent
func TestCalculateChecksum_Consistent(t *testing.T) {
	data := []byte("test data for checksum")
	checksum1 := CalculateChecksum(data)
	checksum2 := CalculateChecksum(data)

	if checksum1 != checksum2 {
		t.Error("checksums should be consistent")
	}
}
