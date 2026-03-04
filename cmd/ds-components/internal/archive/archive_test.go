package archive

import (
	"os"
	"path/filepath"
	"testing"
)

// Tests creating and extracting an archive
func TestCreateAndExtract(t *testing.T) {
	// Create a temporary source directory
	sourceDir, err := os.MkdirTemp("", "archive-source-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(sourceDir)

	// Create some test files
	if err := os.WriteFile(filepath.Join(sourceDir, "file1.txt"), []byte("content1"), 0644); err != nil {
		t.Fatalf("failed to create file1: %v", err)
	}
	if err := os.Mkdir(filepath.Join(sourceDir, "subdir"), 0755); err != nil {
		t.Fatalf("failed to create subdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(sourceDir, "subdir", "file2.txt"), []byte("content2"), 0644); err != nil {
		t.Fatalf("failed to create file2: %v", err)
	}

	// Create archive
	archiveData, totalSize, err := Create(sourceDir)
	if err != nil {
		t.Fatalf("failed to create archive: %v", err)
	}

	if len(archiveData) == 0 {
		t.Error("archive data should not be empty")
	}
	if totalSize != 16 { // "content1" + "content2" = 8 + 8 = 16
		t.Errorf("expected total size 16, got %d", totalSize)
	}

	// Create temporary file for extraction
	tmpFile, err := os.CreateTemp("", "archive-*.tar.gz")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	if _, err := tmpFile.Write(archiveData); err != nil {
		t.Fatalf("failed to write archive: %v", err)
	}
	tmpFile.Close()

	// Extract to new directory
	extractDir, err := os.MkdirTemp("", "archive-extract-*")
	if err != nil {
		t.Fatalf("failed to create extract dir: %v", err)
	}
	defer os.RemoveAll(extractDir)

	if err := Extract(tmpFile.Name(), extractDir); err != nil {
		t.Fatalf("failed to extract archive: %v", err)
	}

	// Verify extracted files
	content1, err := os.ReadFile(filepath.Join(extractDir, "file1.txt"))
	if err != nil {
		t.Fatalf("failed to read extracted file1: %v", err)
	}
	if string(content1) != "content1" {
		t.Errorf("expected 'content1', got '%s'", string(content1))
	}

	content2, err := os.ReadFile(filepath.Join(extractDir, "subdir", "file2.txt"))
	if err != nil {
		t.Fatalf("failed to read extracted file2: %v", err)
	}
	if string(content2) != "content2" {
		t.Errorf("expected 'content2', got '%s'", string(content2))
	}
}

// Tests that common directories are excluded
func TestCreate_ExcludesCommonDirs(t *testing.T) {
	sourceDir, err := os.MkdirTemp("", "archive-exclude-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(sourceDir)

	// Create files that should be included
	if err := os.WriteFile(filepath.Join(sourceDir, "main.go"), []byte("package main"), 0644); err != nil {
		t.Fatalf("failed to create main.go: %v", err)
	}

	// Create directories that should be excluded
	excludeDirs := []string{".git", "node_modules", "__pycache__"}
	for _, dir := range excludeDirs {
		dirPath := filepath.Join(sourceDir, dir)
		if err := os.Mkdir(dirPath, 0755); err != nil {
			t.Fatalf("failed to create %s: %v", dir, err)
		}
		if err := os.WriteFile(filepath.Join(dirPath, "file.txt"), []byte("excluded"), 0644); err != nil {
			t.Fatalf("failed to create file in %s: %v", dir, err)
		}
	}

	// Create archive
	archiveData, _, err := Create(sourceDir)
	if err != nil {
		t.Fatalf("failed to create archive: %v", err)
	}

	// Extract and verify excluded directories are not present
	tmpFile, err := os.CreateTemp("", "archive-*.tar.gz")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Write(archiveData)
	tmpFile.Close()

	extractDir, err := os.MkdirTemp("", "archive-verify-*")
	if err != nil {
		t.Fatalf("failed to create extract dir: %v", err)
	}
	defer os.RemoveAll(extractDir)

	if err := Extract(tmpFile.Name(), extractDir); err != nil {
		t.Fatalf("failed to extract: %v", err)
	}

	// main.go should exist
	if _, err := os.Stat(filepath.Join(extractDir, "main.go")); os.IsNotExist(err) {
		t.Error("main.go should be included")
	}

	// Excluded directories should not exist
	for _, dir := range excludeDirs {
		if _, err := os.Stat(filepath.Join(extractDir, dir)); !os.IsNotExist(err) {
			t.Errorf("%s should be excluded", dir)
		}
	}
}

// Tests shouldExclude function
func TestShouldExclude(t *testing.T) {
	tests := []struct {
		path    string
		exclude bool
	}{
		{".git", true},
		{"node_modules", true},
		{".DS_Store", true},
		{"__pycache__", true},
		{"main.go", false},
		{"src/component.tsx", false},
		{"lib/utils.js", false},
		{".env", true},
		{".env.local", true},
		{"dist", true},
		{"build", true},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			result := shouldExclude(tt.path)
			if result != tt.exclude {
				t.Errorf("shouldExclude(%s) = %v, want %v", tt.path, result, tt.exclude)
			}
		})
	}
}
