#!/bin/bash
# Setup script for DS App Skeleton
# Run once after cloning: ./scripts/setup.sh

set -e

echo "🔧 Configuring git hooks..."
git config core.hooksPath .githooks

echo "📦 Installing backend dependencies..."
cd backend && go mod download && cd ..

echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "✅ Setup complete!"
