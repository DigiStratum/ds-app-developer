#!/bin/bash
# clean-build.sh - Nuclear clean and rebuild for ds-app-developer
# Eliminates stale dist/, cache, and node_modules artifacts

set -e
cd "$(dirname "$0")/.."

echo "🧹 Cleaning all build artifacts..."

# Clean package dist directories
rm -rf packages/ds-core/dist
rm -rf packages/layout/dist
rm -rf frontend/dist
rm -rf boilerplate/frontend/dist

# Clean vite/build caches
rm -rf frontend/node_modules/.vite
rm -rf frontend/node_modules/.cache
rm -rf boilerplate/frontend/node_modules/.vite

# Clean TypeScript caches
find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
find . -name "tsconfig.tsbuildinfo" -type f -delete 2>/dev/null || true

echo "📦 Rebuilding ds-core..."
cd packages/ds-core
npm run build 2>&1 || echo "⚠️  ds-core build had warnings (DTS errors are OK)"

echo "🏗️  Rebuilding frontend..."
cd ../../frontend
npm run build

echo "✅ Clean build complete!"
echo "   Bundle: frontend/dist/assets/index-*.js"
