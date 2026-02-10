#!/bin/bash
# Copy project to WSL local filesystem to avoid Windows path encoding issues
# This copies the project to ~/projects/ which is pure Linux filesystem

set -e

echo "========================================"
echo "  Copy Project to WSL Local Filesystem"
echo "========================================"
echo ""

# Configuration
PROJECT_NAME="pptist-backend"
WSL_PROJECT_DIR="$HOME/projects/$PROJECT_NAME"

# Get Windows path
WINDOWS_PATH="$PWD"

# Convert to WSL path
WSL_PATH=$(echo "$WINDOWS_PATH" | sed 's/\\/\//g' | sed -E 's|^([A-Z]):|/mnt\L\1|')

echo "Source: $WSL_PATH"
echo "Target: $WSL_PROJECT_DIR"
echo ""

# Check if we're in WSL
if ! grep -qi microsoft /proc/version 2>/dev/null; then
    echo "❌ This script must be run from WSL"
    echo ""
    echo "To run from Windows:"
    echo "  wsl bash scripts/copy-to-wsl.sh"
    echo ""
    exit 1
fi

# Create target directory
mkdir -p "$HOME/projects"

# Remove existing copy if it exists
if [ -d "$WSL_PROJECT_DIR" ]; then
    echo "🗑️  Removing existing copy..."
    rm -rf "$WSL_PROJECT_DIR"
fi

# Copy project
echo "📋 Copying project files..."
echo "   (excluding node_modules, dist, coverage, etc.)"
echo ""

rsync -av \
    --progress \
    --exclude 'node_modules' \
    --exclude 'node_modules/*' \
    --exclude 'dist' \
    --exclude 'dist/*' \
    --exclude 'coverage' \
    --exclude 'coverage/*' \
    --exclude '.git' \
    --exclude '.git/*' \
    --exclude '*.log' \
    "$WSL_PATH/" "$WSL_PROJECT_DIR/"

echo ""
echo "✅ Copy complete!"
echo ""
echo "Project location: $WSL_PROJECT_DIR"
echo ""

# Install dependencies
echo "📦 Installing dependencies in WSL..."
cd "$WSL_PROJECT_DIR"
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "To work on the project in WSL:"
echo "  cd ~/projects/$PROJECT_NAME"
echo ""
echo "To run tests:"
echo "  cd ~/projects/$PROJECT_NAME && npm test"
echo ""

# Run tests
echo "🧪 Running tests..."
npm test
