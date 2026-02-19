# Test Templates - Requirements Traceability

This document provides templates for writing tests that trace to requirements.

## Go Test Template

```go
package mypackage

import (
	"testing"
)

// Tests for FR-XXX: Requirement Category
// See REQUIREMENTS.md for full requirement descriptions

// TestFunctionName_Condition_ExpectedBehavior tests FR-XXX-NNN
// FR-XXX-NNN: Brief description of the requirement
func TestFunctionName_Condition_ExpectedBehavior(t *testing.T) {
	// Arrange - set up test data and mocks
	
	// Act - call the function under test
	
	// Assert - verify expected behavior
}

// Table-driven test example for multiple scenarios
func TestFunctionName_Scenarios(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "scenario 1 [FR-XXX-001]",
			input:    "value",
			expected: "result",
		},
		{
			name:     "scenario 2 [FR-XXX-002]",
			input:    "other",
			expected: "other-result",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FunctionUnderTest(tt.input)
			if result != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}
```

## TypeScript/React Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * Tests for FR-XXX: Requirement Category
 * See REQUIREMENTS.md for full requirement descriptions
 */
describe('FR-XXX: Requirement Category', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Tests FR-XXX-001: Brief description of requirement
   */
  describe('FR-XXX-001: Requirement description', () => {
    it('expected behavior when condition', async () => {
      // Arrange
      
      // Act
      render(<Component />);
      
      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });
  });

  /**
   * Tests FR-XXX-002: Another requirement
   */
  describe('FR-XXX-002: Another requirement', () => {
    it('expected behavior', () => {
      // Test implementation
    });
  });
});
```

## Naming Conventions

### Test Function Names (Go)
Pattern: `Test<FunctionName>_<Condition>_<ExpectedBehavior>`

Examples:
- `TestGetUser_WhenNotFound_Returns404`
- `TestMiddleware_WithoutToken_RedirectsToSSO`
- `TestCreateTenant_WithValidData_ReturnsCreatedTenant`

### Test Descriptions (TypeScript)
Pattern: `<action/verb> <expected behavior> when <condition>`

Examples:
- `shows login button when user is not authenticated`
- `redirects to dashboard after successful login`
- `displays error message when API call fails`

## Commit Message Format

When tests are added or modified, reference the requirement in the commit:

```
test(auth): add middleware authentication tests [FR-AUTH-001, FR-AUTH-002]

- Tests for valid token extraction
- Tests for SSO redirect on missing token
- Tests for tenant header extraction
```

## Updating Traceability Table

After adding tests, update the traceability table in REQUIREMENTS.md:

```markdown
| Requirement | Test File | Status |
|-------------|-----------|--------|
| FR-AUTH-001 | `backend/internal/auth/middleware_test.go` | ✅ |
| FR-AUTH-002 | `frontend/src/__tests__/auth.test.tsx` | ✅ |
```

Status values:
- ✅ Tested
- ⚠️ Partial coverage
- ❌ Not tested
- 🚧 In progress
