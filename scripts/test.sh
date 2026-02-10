#!/bin/bash
# Test runner script - handles Windows Chinese path issues

set -e

echo "🧪 Running tests with Windows compatibility..."

# Set environment variables to handle path encoding
export NODE_OPTIONS="--max-old-space-size=4096"

# Try different approaches
if [ "$1" = "docker" ]; then
    echo "🐳 Running tests in Docker container..."
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
else
    echo "🖥️  Running tests locally..."

    # Check if we're on Windows
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "⚠️  Windows detected - using alternative config..."

        # Try using npx with explicit config
        if [ -f "vitest.config.fixed.ts" ]; then
            npx vitest run --config vitest.config.fixed.ts
        else
            # Fallback: run specific test directories
            echo "Running unit tests..."
            npx vitest run tests/unit --reporter=verbose
        fi
    else
        # Unix-like system - use standard config
        npm test
    fi
fi
