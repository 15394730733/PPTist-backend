#!/bin/bash
# WSL test runner - runs tests in Linux environment avoiding Windows path issues

set -e

echo "🐧 Running tests in WSL (Windows Subsystem for Linux)"
echo ""

# Get the Windows path to the project
# In WSL, Windows drives are mounted under /mnt/
WINDOWS_PATH=$(pwd)

# Convert Windows path to WSL path (e.g., E:\ becomes /mnt/e/)
WSL_PATH=$(echo "$WINDOWS_PATH" | sed 's/\\/\//g' | sed -E 's/^([A-Z]):/\/mnt\L\1/')

echo "Windows path: $WINDOWS_PATH"
echo "WSL path:      $WSL_PATH"
echo ""

# Check if we're already in WSL
if grep -qi microsoft /proc/version 2>/dev/null; then
    echo "✅ Already in WSL environment"
    echo ""

    # Run tests
    echo "🧪 Running tests..."
    cd "$WSL_PATH"
    npm test
else
    echo "🔄 Not in WSL, launching WSL..."
    echo ""

    # Launch WSL with the script
    wsl bash -c "cd '$WSL_PATH' && npm test"
fi
