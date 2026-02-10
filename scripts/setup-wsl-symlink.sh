#!/bin/bash
# Setup WSL symlink to avoid Chinese path issues
# This creates a symlink in WSL home directory pointing to the project

set -e

echo "========================================"
echo "  WSL Symlink Setup"
echo "========================================"
echo ""

# WSL home directory
WSL_HOME="$HOME"
SYMLINK_NAME="pptist-backend"

# Get Windows path
WINDOWS_PATH="$PWD"

# Convert to WSL path
WSL_PATH=$(echo "$WINDOWS_PATH" | sed 's/\\/\//g' | sed -E 's|^([A-Z]):|/mnt\L\1|')

echo "Windows path: $WINDOWS_PATH"
echo "WSL path:      $WSL_PATH"
echo "WSL home:      $WSL_HOME"
echo ""

# Check if we're in WSL
if ! grep -qi microsoft /proc/version 2>/dev/null; then
    echo "❌ This script must be run from WSL"
    echo ""
    echo "To run from Windows:"
    echo "  wsl bash scripts/setup-wsl-symlink.sh"
    echo ""
    exit 1
fi

# Remove existing symlink if it exists
if [ -L "$WSL_HOME/$SYMLINK_NAME" ]; then
    echo "🗑️  Removing existing symlink..."
    rm "$WSL_HOME/$SYMLINK_NAME"
fi

# Create new symlink
echo "🔗 Creating symlink: $WSL_HOME/$SYMLINK_NAME -> $WSL_PATH"
ln -s "$WSL_PATH" "$WSL_HOME/$SYMLINK_NAME"

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run tests:"
echo "  cd ~/$SYMLINK_NAME"
echo "  npm test"
echo ""
echo "Or use the shortcut:"
echo "  cd ~pptist && npm test"
echo ""

# Optional: Ask if user wants to run tests now
read -p "Run tests now? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🧪 Running tests..."
    cd "$WSL_HOME/$SYMLINK_NAME"

    # Reinstall dependencies in WSL
    echo ""
    echo "📦 Installing dependencies..."
    rm -rf node_modules package-lock.json
    npm install

    echo ""
    echo "🧪 Running tests..."
    npm test
fi
