package models

import (
	"encoding/json"
	"testing"
	"time"
)

// Tests: BaseModel has correct JSON tags
func TestBaseModel_JSONTags(t *testing.T) {
	now := time.Now()
	model := BaseModel{
		ID:        "test-id",
		TenantID:  "tenant-1",
		CreatedAt: now,
		UpdatedAt: now,
	}

	data, err := json.Marshal(model)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded map[string]interface{}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded["id"] != "test-id" {
		t.Errorf("expected id 'test-id', got %v", decoded["id"])
	}
	if decoded["tenant_id"] != "tenant-1" {
		t.Errorf("expected tenant_id 'tenant-1', got %v", decoded["tenant_id"])
	}
	if decoded["created_at"] == nil {
		t.Error("expected created_at to be set")
	}
	if decoded["updated_at"] == nil {
		t.Error("expected updated_at to be set")
	}
}

// Tests: BaseModel fields are accessible
func TestBaseModel_Fields(t *testing.T) {
	now := time.Now()
	model := BaseModel{
		ID:        "test-id",
		TenantID:  "tenant-1",
		CreatedAt: now,
		UpdatedAt: now,
	}

	if model.ID != "test-id" {
		t.Error("ID not accessible")
	}
	if model.TenantID != "tenant-1" {
		t.Error("TenantID not accessible")
	}
	if model.CreatedAt.IsZero() {
		t.Error("CreatedAt not set")
	}
	if model.UpdatedAt.IsZero() {
		t.Error("UpdatedAt not set")
	}
}

// Tests: Example embeds BaseModel
func TestExample_EmbedsBaseModel(t *testing.T) {
	now := time.Now()
	example := Example{
		BaseModel: BaseModel{
			ID:        "example-id",
			TenantID:  "tenant-1",
			CreatedAt: now,
			UpdatedAt: now,
		},
		Name:        "Test Example",
		Description: "A test example",
	}

	// Access embedded fields
	if example.ID != "example-id" {
		t.Error("embedded ID not accessible")
	}
	if example.TenantID != "tenant-1" {
		t.Error("embedded TenantID not accessible")
	}
	if example.Name != "Test Example" {
		t.Error("Name not accessible")
	}
	if example.Description != "A test example" {
		t.Error("Description not accessible")
	}
}

// Tests: Example JSON marshaling
func TestExample_JSONMarshal(t *testing.T) {
	now := time.Now()
	example := Example{
		BaseModel: BaseModel{
			ID:        "example-id",
			TenantID:  "tenant-1",
			CreatedAt: now,
			UpdatedAt: now,
		},
		Name:        "Test Example",
		Description: "A test example",
	}

	data, err := json.Marshal(example)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded Example
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.ID != example.ID {
		t.Error("ID not preserved")
	}
	if decoded.Name != example.Name {
		t.Error("Name not preserved")
	}
	if decoded.Description != example.Description {
		t.Error("Description not preserved")
	}
}

// Tests: BaseModel zero values
func TestBaseModel_ZeroValues(t *testing.T) {
	model := BaseModel{}

	if model.ID != "" {
		t.Error("expected empty ID")
	}
	if model.TenantID != "" {
		t.Error("expected empty TenantID")
	}
	if !model.CreatedAt.IsZero() {
		t.Error("expected zero CreatedAt")
	}
}

// Tests: Example zero values
func TestExample_ZeroValues(t *testing.T) {
	example := Example{}

	if example.Name != "" {
		t.Error("expected empty Name")
	}
	if example.Description != "" {
		t.Error("expected empty Description")
	}
}
