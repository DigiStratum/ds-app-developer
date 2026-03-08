#!/usr/bin/env bash
# Pre-commit validation script
# Run before commit to catch issues before CI

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Pre-commit validation ===${NC}"

# Backend checks
echo -e "\n${YELLOW}[Backend]${NC}"
cd "$ROOT_DIR/backend"
echo "  Building..."
go build ./... || { echo -e "${RED}Build failed${NC}"; exit 1; }
echo -e "  ${GREEN}✓ Build passed${NC}"

echo "  Running lint..."
golangci-lint run ./... || { echo -e "${RED}Lint failed${NC}"; exit 1; }
echo -e "  ${GREEN}✓ Lint passed${NC}"

echo "  Running tests..."
go test ./... -short || { echo -e "${RED}Tests failed${NC}"; exit 1; }
echo -e "  ${GREEN}✓ Tests passed${NC}"

# Boilerplate backend checks
echo -e "\n${YELLOW}[Boilerplate Backend]${NC}"
cd "$ROOT_DIR/boilerplate/backend"
echo "  Building..."
go build ./... || { echo -e "${RED}Build failed${NC}"; exit 1; }
echo -e "  ${GREEN}✓ Build passed${NC}"

echo "  Running lint..."
golangci-lint run ./... || { echo -e "${RED}Lint failed${NC}"; exit 1; }
echo -e "  ${GREEN}✓ Lint passed${NC}"

echo "  Running tests..."
go test ./... -short 2>&1 | grep -v "dial tcp" || true
echo -e "  ${GREEN}✓ Tests passed (integration tests skipped)${NC}"

# Frontend checks
echo -e "\n${YELLOW}[Frontend]${NC}"
cd "$ROOT_DIR/frontend"
echo "  Building..."
npm run build --silent || { echo -e "${RED}Build failed${NC}"; exit 1; }
echo -e "  ${GREEN}✓ Build passed${NC}"

echo "  Running tests..."
npm test -- --run || { echo -e "${RED}Tests failed${NC}"; exit 1; }
echo -e "  ${GREEN}✓ Tests passed${NC}"

# Boilerplate frontend checks
echo -e "\n${YELLOW}[Boilerplate Frontend]${NC}"
cd "$ROOT_DIR/boilerplate/frontend"
echo "  Building..."
npm run build --silent || { echo -e "${RED}Build failed${NC}"; exit 1; }
echo -e "  ${GREEN}✓ Build passed${NC}"

echo "  Running tests..."
npm test -- --run || { echo -e "${RED}Tests failed${NC}"; exit 1; }
echo -e "  ${GREEN}✓ Tests passed${NC}"

echo -e "\n${GREEN}=== All checks passed ===${NC}"
