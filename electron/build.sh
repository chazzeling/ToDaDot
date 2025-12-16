#!/bin/bash
# Cross-platform build script for Electron main and preload processes

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

echo "Current directory: $(pwd)"
echo "Project root: $PROJECT_ROOT"

echo "Building main.cjs..."
export BUILD_TARGET=main
echo "BUILD_TARGET = $BUILD_TARGET"
npx vite build --config electron/vite.config.ts

if [ ! -f "dist-electron/main.cjs" ]; then
    echo "❌ main.cjs NOT FOUND after build"
    echo "Files in dist-electron:"
    ls -la dist-electron/ 2>/dev/null || echo "dist-electron directory not found"
    exit 1
fi

MAIN_SIZE=$(stat -f%z dist-electron/main.cjs 2>/dev/null || stat -c%s dist-electron/main.cjs 2>/dev/null || echo "unknown")
echo "✅ main.cjs verified: ${MAIN_SIZE} bytes"

echo "Building preload.cjs..."
export BUILD_TARGET=preload
echo "BUILD_TARGET = $BUILD_TARGET"
npx vite build --config electron/vite.config.ts

if [ ! -f "dist-electron/preload.cjs" ]; then
    echo "❌ preload.cjs NOT FOUND after build"
    exit 1
fi

PRELOAD_SIZE=$(stat -f%z dist-electron/preload.cjs 2>/dev/null || stat -c%s dist-electron/preload.cjs 2>/dev/null || echo "unknown")
echo "✅ preload.cjs verified: ${PRELOAD_SIZE} bytes"

echo "✅ Build complete!"
echo "Final files in dist-electron:"
find dist-electron -type f -exec ls -lh {} \;





