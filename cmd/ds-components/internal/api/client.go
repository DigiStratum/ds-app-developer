// Package api provides HTTP client for the DS Component Registry API.
package api

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// Client is the HTTP client for the component registry API.
type Client struct {
	baseURL    string
	httpClient *http.Client
	authToken  string
	verbose    bool
}

// NewClient creates a new API client.
func NewClient(baseURL, authToken string, verbose bool) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		authToken: authToken,
		verbose:   verbose,
	}
}

// Component represents a registered component.
type Component struct {
	Name               string    `json:"name"`
	Description        string    `json:"description"`
	Author             string    `json:"author"`
	Repository         string    `json:"repository,omitempty"`
	License            string    `json:"license,omitempty"`
	Keywords           []string  `json:"keywords,omitempty"`
	LatestVersion      string    `json:"latest_version,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
	Deprecated         bool      `json:"deprecated,omitempty"`
	DeprecationMessage string    `json:"deprecation_message,omitempty"`
}

// Version represents a published version of a component.
type Version struct {
	ComponentName      string            `json:"component_name"`
	Version            string            `json:"version"`
	S3Key              string            `json:"s3_key"`
	Size               int64             `json:"size"`
	Checksum           string            `json:"checksum"`
	Dependencies       map[string]string `json:"dependencies,omitempty"`
	PeerDependencies   map[string]string `json:"peer_dependencies,omitempty"`
	PublishedAt        time.Time         `json:"published_at"`
	PublishedBy        string            `json:"published_by"`
	Deprecated         bool              `json:"deprecated,omitempty"`
	DeprecationMessage string            `json:"deprecation_message,omitempty"`
}

// ComponentWithVersions is the response from GET /api/components/{name}
type ComponentWithVersions struct {
	Component *Component `json:"component"`
	Versions  []*Version `json:"versions"`
}

// ListComponentsResponse is the response from GET /api/components
type ListComponentsResponse struct {
	Components []*Component `json:"components"`
	Count      int          `json:"count"`
}

// DownloadResponse is the response from GET /api/components/{name}/{version}
type DownloadResponse struct {
	DownloadURL string   `json:"download_url"`
	Version     *Version `json:"version"`
}

// PublishVersionResponse is the response from PUT /api/components/{name}/{version}
type PublishVersionResponse struct {
	UploadURL string   `json:"upload_url"`
	Version   *Version `json:"version"`
}

// RegisterRequest is the request body for POST /api/components
type RegisterRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Repository  string   `json:"repository,omitempty"`
	License     string   `json:"license,omitempty"`
	Keywords    []string `json:"keywords,omitempty"`
}

// PublishRequest is the request body for PUT /api/components/{name}/{version}
type PublishRequest struct {
	Size             int64             `json:"size"`
	Checksum         string            `json:"checksum"`
	Dependencies     map[string]string `json:"dependencies,omitempty"`
	PeerDependencies map[string]string `json:"peer_dependencies,omitempty"`
}

// ErrorResponse is the standard API error response.
type ErrorResponse struct {
	Error struct {
		Code      string            `json:"code"`
		Message   string            `json:"message"`
		Details   map[string]string `json:"details,omitempty"`
		RequestID string            `json:"request_id,omitempty"`
	} `json:"error"`
}

// ListComponents returns all registered components.
func (c *Client) ListComponents(ctx context.Context) ([]*Component, error) {
	resp, err := c.doRequest(ctx, "GET", "/api/components", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, c.parseError(resp)
	}

	var result ListComponentsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return result.Components, nil
}

// GetComponent returns a component with its versions.
func (c *Client) GetComponent(ctx context.Context, name string) (*ComponentWithVersions, error) {
	resp, err := c.doRequest(ctx, "GET", "/api/components/"+name, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, c.parseError(resp)
	}

	var result ComponentWithVersions
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// GetVersion returns download URL for a specific version.
func (c *Client) GetVersion(ctx context.Context, name, version string) (*DownloadResponse, error) {
	resp, err := c.doRequest(ctx, "GET", fmt.Sprintf("/api/components/%s/%s", name, version), nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, c.parseError(resp)
	}

	var result DownloadResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// Register creates a new component in the registry.
func (c *Client) Register(ctx context.Context, req *RegisterRequest) (*Component, error) {
	resp, err := c.doRequest(ctx, "POST", "/api/components", req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return nil, c.parseError(resp)
	}

	var result Component
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// Publish creates a new version and returns the upload URL.
func (c *Client) Publish(ctx context.Context, name, version string, req *PublishRequest) (*PublishVersionResponse, error) {
	resp, err := c.doRequest(ctx, "PUT", fmt.Sprintf("/api/components/%s/%s", name, version), req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return nil, c.parseError(resp)
	}

	var result PublishVersionResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// UploadArtifact uploads the artifact to the presigned URL.
func (c *Client) UploadArtifact(ctx context.Context, uploadURL string, data []byte) error {
	req, err := http.NewRequestWithContext(ctx, "PUT", uploadURL, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("failed to create upload request: %w", err)
	}
	req.Header.Set("Content-Type", "application/gzip")
	req.ContentLength = int64(len(data))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("upload failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upload failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// DownloadArtifact downloads the artifact from the presigned URL.
func (c *Client) DownloadArtifact(ctx context.Context, downloadURL string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", downloadURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create download request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("download failed with status %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

// DownloadArtifactToFile downloads the artifact directly to a file to avoid loading into memory.
func (c *Client) DownloadArtifactToFile(ctx context.Context, downloadURL, filePath string) error {
	req, err := http.NewRequestWithContext(ctx, "GET", downloadURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create download request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed with status %d", resp.StatusCode)
	}

	f, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer f.Close()

	_, err = io.Copy(f, resp.Body)
	return err
}

// CalculateChecksum computes SHA256 checksum of data.
func CalculateChecksum(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// CalculateFileChecksum computes SHA256 checksum of a file.
func CalculateFileChecksum(filePath string) (string, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, f); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

func (c *Client) doRequest(ctx context.Context, method, path string, body interface{}) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}

	if c.verbose {
		fmt.Printf("→ %s %s\n", method, c.baseURL+path)
	}

	return c.httpClient.Do(req)
}

func (c *Client) parseError(resp *http.Response) error {
	var errResp ErrorResponse
	if err := json.NewDecoder(resp.Body).Decode(&errResp); err != nil {
		return fmt.Errorf("request failed with status %d", resp.StatusCode)
	}
	return fmt.Errorf("%s: %s", errResp.Error.Code, errResp.Error.Message)
}
