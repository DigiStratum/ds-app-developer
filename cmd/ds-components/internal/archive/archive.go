// Package archive provides tar.gz archive operations for component artifacts.
package archive

import (
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Create creates a tar.gz archive from a directory.
// Returns the archive data and the total uncompressed size.
func Create(sourceDir string) ([]byte, int64, error) {
	// Create a temporary file for the archive
	tmpFile, err := os.CreateTemp("", "ds-component-*.tar.gz")
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	gzw := gzip.NewWriter(tmpFile)
	tw := tar.NewWriter(gzw)

	var totalSize int64

	err = filepath.Walk(sourceDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Get relative path
		relPath, err := filepath.Rel(sourceDir, path)
		if err != nil {
			return err
		}

		// Skip the root directory itself
		if relPath == "." {
			return nil
		}

		// Skip common excludes
		if shouldExclude(relPath) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Create tar header
		header, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return fmt.Errorf("failed to create header for %s: %w", relPath, err)
		}
		header.Name = relPath

		// Handle symlinks
		if info.Mode()&os.ModeSymlink != 0 {
			link, err := os.Readlink(path)
			if err != nil {
				return fmt.Errorf("failed to read symlink %s: %w", path, err)
			}
			header.Linkname = link
		}

		if err := tw.WriteHeader(header); err != nil {
			return fmt.Errorf("failed to write header for %s: %w", relPath, err)
		}

		// Write file content if it's a regular file
		if info.Mode().IsRegular() {
			f, err := os.Open(path)
			if err != nil {
				return fmt.Errorf("failed to open %s: %w", path, err)
			}
			defer f.Close()

			n, err := io.Copy(tw, f)
			if err != nil {
				return fmt.Errorf("failed to write %s: %w", relPath, err)
			}
			totalSize += n
		}

		return nil
	})
	if err != nil {
		return nil, 0, err
	}

	if err := tw.Close(); err != nil {
		return nil, 0, fmt.Errorf("failed to close tar writer: %w", err)
	}
	if err := gzw.Close(); err != nil {
		return nil, 0, fmt.Errorf("failed to close gzip writer: %w", err)
	}

	// Read the archive data
	if _, err := tmpFile.Seek(0, 0); err != nil {
		return nil, 0, err
	}
	data, err := io.ReadAll(tmpFile)
	if err != nil {
		return nil, 0, err
	}

	return data, totalSize, nil
}

// Extract extracts a tar.gz archive to a directory.
func Extract(archivePath, destDir string) error {
	f, err := os.Open(archivePath)
	if err != nil {
		return fmt.Errorf("failed to open archive: %w", err)
	}
	defer f.Close()

	return ExtractReader(f, destDir)
}

// ExtractReader extracts a tar.gz archive from a reader to a directory.
func ExtractReader(r io.Reader, destDir string) error {
	gzr, err := gzip.NewReader(r)
	if err != nil {
		return fmt.Errorf("failed to create gzip reader: %w", err)
	}
	defer gzr.Close()

	tr := tar.NewReader(gzr)

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to read tar header: %w", err)
		}

		// Sanitize path to prevent path traversal
		target := filepath.Join(destDir, header.Name)
		if !strings.HasPrefix(filepath.Clean(target), filepath.Clean(destDir)+string(os.PathSeparator)) {
			return fmt.Errorf("invalid file path: %s", header.Name)
		}

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, os.FileMode(header.Mode)); err != nil {
				return fmt.Errorf("failed to create directory %s: %w", target, err)
			}

		case tar.TypeReg:
			// Ensure parent directory exists
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return fmt.Errorf("failed to create parent directory: %w", err)
			}

			f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				return fmt.Errorf("failed to create file %s: %w", target, err)
			}

			if _, err := io.Copy(f, tr); err != nil {
				f.Close()
				return fmt.Errorf("failed to write file %s: %w", target, err)
			}
			f.Close()

		case tar.TypeSymlink:
			// Ensure parent directory exists
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return fmt.Errorf("failed to create parent directory: %w", err)
			}

			if err := os.Symlink(header.Linkname, target); err != nil {
				return fmt.Errorf("failed to create symlink %s: %w", target, err)
			}

		default:
			// Skip other types
		}
	}

	return nil
}

// shouldExclude returns true if the path should be excluded from the archive.
func shouldExclude(path string) bool {
	excludes := []string{
		".git",
		".gitignore",
		"node_modules",
		".DS_Store",
		"__pycache__",
		".pytest_cache",
		"*.pyc",
		".env",
		".env.local",
		"coverage",
		"dist",
		"build",
	}

	base := filepath.Base(path)
	for _, exclude := range excludes {
		if strings.HasPrefix(exclude, "*") {
			// Glob pattern
			if matched, _ := filepath.Match(exclude, base); matched {
				return true
			}
		} else if base == exclude {
			return true
		}
	}

	return false
}
