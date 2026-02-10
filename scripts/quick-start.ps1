# Quick Start Script for PPTist Backend (Windows PowerShell)
# This script helps you get started quickly with the PPTist backend service

$ErrorActionPreference = "Stop"

# Color functions
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success {
    Write-ColorOutput Green "[OK] $args"
}

function Write-Info {
    Write-ColorOutput Cyan "[INFO] $args"
}

function Write-Warning {
    Write-ColorOutput Yellow "[WARN] $args"
}

Write-Info "========================================"
Write-Info "PPTist Backend - Quick Start"
Write-Info "========================================"
Write-Output ""

# Check Docker
Write-Info "[1/5] Checking prerequisites..."

try {
    $dockerVersion = docker --version
    Write-Success "Docker is installed: $dockerVersion"
} catch {
    Write-Warning "Docker not found. Please install Docker Desktop for Windows."
    Write-Output "  Visit: https://docs.docker.com/desktop/windows/install/"
    exit 1
}

try {
    $composeVersion = docker-compose --version
    Write-Success "Docker Compose is installed: $composeVersion"
} catch {
    Write-Warning "Docker Compose not found. Please install Docker Compose."
    Write-Output "  Visit: https://docs.docker.com/compose/install/"
    exit 1
}

Write-Output ""

# Create .env file
Write-Info "[2/5] Setting up environment..."

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Success "Created .env file from template"
    Write-Warning "Note: You may want to edit .env to customize configuration"
} else {
    Write-Success ".env file already exists"
}

Write-Output ""

# Build Docker image
Write-Info "[3/5] Building Docker image..."

try {
    docker build -t pptist-backend:latest . | Out-Null
    Write-Success "Docker image built successfully"
} catch {
    Write-Warning "Docker build had warnings. Check logs above."
}

Write-Output ""

# Start services
Write-Info "[4/5] Starting services..."

try {
    docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d | Out-Null
    Write-Success "Services started successfully"
} catch {
    Write-Warning "Some services may not have started properly"
    Write-Output "  Run: docker-compose logs to see what happened"
}

Write-Output ""

# Wait for health check
Write-Info "[5/5] Waiting for service to be ready..."

$maxRetries = 10
$retryInterval = 2

for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "Service is ready!"
            Write-Output ""
            Write-Output "========================================"
            Write-Output "Setup Complete!"
            Write-Output "========================================"
            Write-Output ""
            Write-Output "Service URLs:"
            Write-Output "  - API:        http://localhost:3000"
            Write-Output "  - Health:     http://localhost:3000/health"
            Write-Output "  - Docs:       http://localhost:3000/docs"
            Write-Output "  - Metrics:    http://localhost:9090/metrics"
            Write-Output "  - Grafana:    http://localhost:3001 (dev only)"
            Write-Output "  - Prometheus: http://localhost:9091 (dev only)"
            Write-Output ""
            Write-Output "Useful Commands:"
            Write-Output "  - View logs:  .\scripts\deploy.ps1 dev logs"
            Write-Output "  - Stop:       .\scripts\deploy.ps1 dev down"
            Write-Output "  - Restart:    .\scripts\deploy.ps1 dev restart"
            Write-Output "  - Status:     .\scripts\deploy.ps1 dev status"
            Write-Output ""
            exit 0
        }
    } catch {
        # Ignore errors and retry
    }

    Write-Host -NoNewline "."
    Start-Sleep -Seconds $retryInterval
}

Write-Output ""
Write-Warning "Service is taking longer than expected to start"
Write-Output "  Check: docker-compose ps"
Write-Output "  Logs:  .\scripts\deploy.ps1 dev logs"
exit 1
