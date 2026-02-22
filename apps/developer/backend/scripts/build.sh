#!/bin/bash
# Build script for Lambda deployment

set -e

cd "$(dirname "$0")/.."

echo "Building Lambda binary..."
mkdir -p dist

GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o dist/bootstrap ./cmd/lambda

echo "Build complete: dist/bootstrap"
ls -la dist/bootstrap
