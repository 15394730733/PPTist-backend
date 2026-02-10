# PowerShell test runner script
# Handles Windows Chinese path encoding issues

$ErrorActionPreference = "Stop"

Write-Host "🧪 Running tests with Windows compatibility..." -ForegroundColor Cyan

# Set environment variables
$env:NODE_OPTIONS = "--max-old-space-size=4096"

# Check if Docker is available
$dockerAvailable = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)

if ($args -contains "-docker" -and $dockerAvailable) {
    Write-Host "🐳 Running tests in Docker container..." -ForegroundColor Yellow
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
    exit $LASTEXITCODE
}

Write-Host "🖥️  Running tests locally..." -ForegroundColor Yellow

# Try approach 1: Use fixed config
if (Test-Path "vitest.config.fixed.ts") {
    Write-Host "Using fixed configuration..." -ForegroundColor Green
    npx vitest run --config vitest.config.fixed.ts
    exit $LASTEXITCODE
}

# Try approach 2: Run specific test directories
Write-Host "Running unit tests by directory..." -ForegroundColor Green
$testDirs = @(
    "tests/unit/models",
    "tests/unit/utils",
    "tests/unit/services/queue",
    "tests/unit/services/conversion"
)

foreach ($dir in $testDirs) {
    if (Test-Path $dir) {
        Write-Host "Testing $dir..." -ForegroundColor Cyan
        npx vitest run $dir --reporter=verbose
    }
}

Write-Host "✅ All tests completed!" -ForegroundColor Green
