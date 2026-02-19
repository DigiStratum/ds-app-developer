# DS App Skeleton Makefile
#
# Common development and testing commands
# Run `make help` for available targets

.PHONY: help build test test-unit test-integration test-integration-fast test-frontend lint clean

# Default target
help:
	@echo "DS App Skeleton - Available targets:"
	@echo ""
	@echo "  build              Build all components"
	@echo "  test               Run all tests (unit + integration)"
	@echo "  test-unit          Run unit tests only"
	@echo "  test-integration   Start deps and run integration tests"
	@echo "  test-integration-fast  Run integration tests (deps already running)"
	@echo "  test-frontend      Run frontend tests"
	@echo "  lint               Run linters"
	@echo "  clean              Clean build artifacts"
	@echo ""
	@echo "Test dependencies:"
	@echo "  deps-up            Start test dependencies (DynamoDB Local)"
	@echo "  deps-down          Stop test dependencies"
	@echo ""

# Build all components
build:
	cd backend && go build -o dist/bootstrap cmd/api/main.go
	cd frontend && npm run build

# Run all tests
test: test-unit test-integration

# Run unit tests only (no external dependencies)
test-unit:
	@echo "==> Running backend unit tests..."
	cd backend && go test ./internal/... -v
	@echo ""
	@echo "==> Running frontend unit tests..."
	cd frontend && npm run test -- --run

# Start dependencies and run integration tests
test-integration: deps-up
	@echo "==> Waiting for DynamoDB Local..."
	@sleep 2
	@echo "==> Running integration tests..."
	cd backend && DYNAMODB_ENDPOINT=http://localhost:8000 go test ./test/integration/... -v
	@make deps-down

# Run integration tests (assumes dependencies are already running)
test-integration-fast:
	@echo "==> Running integration tests..."
	cd backend && DYNAMODB_ENDPOINT=http://localhost:8000 go test ./test/integration/... -v

# Run frontend tests
test-frontend:
	cd frontend && npm run test

# Run linters
lint:
	@echo "==> Linting backend..."
	cd backend && go vet ./...
	@echo ""
	@echo "==> Linting frontend..."
	cd frontend && npm run lint

# Start test dependencies
deps-up:
	@echo "==> Starting test dependencies..."
	docker-compose -f docker-compose.test.yml up -d
	@echo "==> DynamoDB Local available at http://localhost:8000"

# Stop test dependencies
deps-down:
	@echo "==> Stopping test dependencies..."
	docker-compose -f docker-compose.test.yml down

# Clean build artifacts
clean:
	rm -rf backend/dist
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.vite

# Coverage reports
coverage:
	@echo "==> Backend coverage..."
	cd backend && go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out -o coverage.html
	@echo "==> Frontend coverage..."
	cd frontend && npm run test:coverage
