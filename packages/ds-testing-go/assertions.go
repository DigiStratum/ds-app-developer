package dstesting

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
)

// AssertStatus checks that the response has the expected status code
func AssertStatus(t *testing.T, resp *http.Response, expected int) {
	t.Helper()
	if resp.StatusCode != expected {
		body, _ := io.ReadAll(resp.Body)
		t.Errorf("expected status %d, got %d; body: %s", expected, resp.StatusCode, string(body))
	}
}

// AssertStatusOK checks that the response has status 200 OK
func AssertStatusOK(t *testing.T, resp *http.Response) {
	AssertStatus(t, resp, http.StatusOK)
}

// AssertStatusCreated checks that the response has status 201 Created
func AssertStatusCreated(t *testing.T, resp *http.Response) {
	AssertStatus(t, resp, http.StatusCreated)
}

// AssertStatusNoContent checks that the response has status 204 No Content
func AssertStatusNoContent(t *testing.T, resp *http.Response) {
	AssertStatus(t, resp, http.StatusNoContent)
}

// AssertStatusBadRequest checks that the response has status 400 Bad Request
func AssertStatusBadRequest(t *testing.T, resp *http.Response) {
	AssertStatus(t, resp, http.StatusBadRequest)
}

// AssertStatusUnauthorized checks that the response has status 401 Unauthorized
func AssertStatusUnauthorized(t *testing.T, resp *http.Response) {
	AssertStatus(t, resp, http.StatusUnauthorized)
}

// AssertStatusForbidden checks that the response has status 403 Forbidden
func AssertStatusForbidden(t *testing.T, resp *http.Response) {
	AssertStatus(t, resp, http.StatusForbidden)
}

// AssertStatusNotFound checks that the response has status 404 Not Found
func AssertStatusNotFound(t *testing.T, resp *http.Response) {
	AssertStatus(t, resp, http.StatusNotFound)
}

// AssertStatusConflict checks that the response has status 409 Conflict
func AssertStatusConflict(t *testing.T, resp *http.Response) {
	AssertStatus(t, resp, http.StatusConflict)
}

// AssertStatusInternalError checks that the response has status 500 Internal Server Error
func AssertStatusInternalError(t *testing.T, resp *http.Response) {
	AssertStatus(t, resp, http.StatusInternalServerError)
}

// AssertContentType checks that the response has the expected content type
func AssertContentType(t *testing.T, resp *http.Response, expected string) {
	t.Helper()
	actual := resp.Header.Get("Content-Type")
	if actual != expected {
		t.Errorf("expected Content-Type %q, got %q", expected, actual)
	}
}

// AssertContentTypeJSON checks that the response has JSON content type
func AssertContentTypeJSON(t *testing.T, resp *http.Response) {
	t.Helper()
	actual := resp.Header.Get("Content-Type")
	if !strings.HasPrefix(actual, "application/json") {
		t.Errorf("expected Content-Type application/json, got %q", actual)
	}
}

// AssertHeader checks that a response header has the expected value
func AssertHeader(t *testing.T, resp *http.Response, key, expected string) {
	t.Helper()
	actual := resp.Header.Get(key)
	if actual != expected {
		t.Errorf("expected header %s=%q, got %q", key, expected, actual)
	}
}

// AssertHeaderExists checks that a response header exists
func AssertHeaderExists(t *testing.T, resp *http.Response, key string) {
	t.Helper()
	actual := resp.Header.Get(key)
	if actual == "" {
		t.Errorf("expected header %s to exist, but it was empty or missing", key)
	}
}

// ReadJSON reads and unmarshals JSON response body
func ReadJSON[T any](t *testing.T, resp *http.Response) T {
	t.Helper()
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	var result T
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("failed to unmarshal JSON: %v; body: %s", err, string(body))
	}

	return result
}

// ReadBody reads the response body as a string
func ReadBody(t *testing.T, resp *http.Response) string {
	t.Helper()
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	return string(body)
}

// AssertJSONContains checks that the JSON response contains a specific field with value
func AssertJSONContains(t *testing.T, resp *http.Response, key string, expected interface{}) {
	t.Helper()
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("failed to unmarshal JSON: %v; body: %s", err, string(body))
	}

	actual, exists := result[key]
	if !exists {
		t.Errorf("expected JSON to contain key %q, but it was missing; body: %s", key, string(body))
		return
	}

	// Handle type comparisons
	switch exp := expected.(type) {
	case int:
		if actNum, ok := actual.(float64); ok {
			if int(actNum) != exp {
				t.Errorf("expected %s=%d, got %v", key, exp, actual)
			}
			return
		}
	case int64:
		if actNum, ok := actual.(float64); ok {
			if int64(actNum) != exp {
				t.Errorf("expected %s=%d, got %v", key, exp, actual)
			}
			return
		}
	}

	if actual != expected {
		t.Errorf("expected %s=%v, got %v", key, expected, actual)
	}
}

// AssertJSONArrayLength checks that a JSON array response has the expected length
func AssertJSONArrayLength(t *testing.T, resp *http.Response, expected int) {
	t.Helper()
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	var result []interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("failed to unmarshal JSON array: %v; body: %s", err, string(body))
	}

	if len(result) != expected {
		t.Errorf("expected array length %d, got %d", expected, len(result))
	}
}
