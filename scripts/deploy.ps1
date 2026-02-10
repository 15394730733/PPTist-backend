# PPTist Backend Deployment Script (PowerShell)
# Usage: .\scripts\deploy.ps1 [-Environment] <string> [-Command] <string>
#   Environment: dev | test | prod (default: dev)
#   Command: build | up | down | restart | logs | status (default: up)

param(
    [Parameter(Position=0)]
    [ValidateSet('dev', 'test', 'prod', 'development', 'testing', 'production')]
    [string]$Environment = "dev",

    [Parameter(Position=1)]
    [ValidateSet('build', 'up', 'down', 'restart', 'logs', 'status', 'health', 'clean')]
    [string]$Command = "up"
)

# Color functions
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Log-Info {
    Write-ColorOutput Cyan "[INFO] $args"
}

function Log-Success {
    Write-ColorOutput Green "[SUCCESS] $args"
}

function Log-Warning {
    Write-ColorOutput Yellow "[WARNING] $args"
}

function Log-Error {
    Write-ColorOutput Red "[ERROR] $args"
}

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

# Normalize environment name
switch ($Environment) {
    {$_ -in @('dev', 'development')} {
        $EnvFile = "docker-compose.dev.yml"
        Log-Info "Using development environment"
    }
    {$_ -in @('test', 'testing')} {
        $EnvFile = "docker-compose.test.yml"
        Log-Info "Using test environment"
    }
    {$_ -in @('prod', 'production')} {
        $EnvFile = "docker-compose.prod.yml"
        Log-Info "Using production environment"
    }
}

# Change to project directory
Set-Location $ProjectDir

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Log-Warning ".env file not found, creating from .env.example"
    Copy-Item ".env.example" ".env"
    Log-Info "Please edit .env file with your configuration"
}

# Execute command
switch ($Command) {
    "build" {
        Log-Info "Building Docker images for $Environment environment..."
        docker-compose -f docker-compose.base.yml -f $EnvFile build
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Build completed"
        } else {
            Log-Error "Build failed"
            exit 1
        }
    }
    "up" {
        Log-Info "Starting services for $Environment environment..."
        docker-compose -f docker-compose.base.yml -f $EnvFile up -d
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Services started"
            Log-Info "Use '.\scripts\deploy.ps1 $Environment logs' to view logs"
        } else {
            Log-Error "Failed to start services"
            exit 1
        }
    }
    "down" {
        Log-Info "Stopping services for $Environment environment..."
        docker-compose -f docker-compose.base.yml -f $EnvFile down
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Services stopped"
        } else {
            Log-Error "Failed to stop services"
            exit 1
        }
    }
    "restart" {
        Log-Info "Restarting services for $Environment environment..."
        docker-compose -f docker-compose.base.yml -f $EnvFile restart
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Services restarted"
        } else {
            Log-Error "Failed to restart services"
            exit 1
        }
    }
    "logs" {
        Log-Info "Showing logs for $Environment environment (Ctrl+C to exit)..."
        docker-compose -f docker-compose.base.yml -f $EnvFile logs -f
    }
    "status" {
        Log-Info "Service status for $Environment environment:"
        docker-compose -f docker-compose.base.yml -f $EnvFile ps
    }
    "health" {
        Log-Info "Checking service health..."
        $health = docker-compose -f docker-compose.base.yml -f $EnvFile exec app wget -q -O- http://localhost:3000/health
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Health check passed"
            Write-Output $health
        } else {
            Log-Error "Health check failed"
            exit 1
        }
    }
    "clean" {
        Log-Warning "This will remove all containers, volumes, and images for $Environment environment"
        $confirmation = Read-Host "Are you sure? (y/N)"
        if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
            Log-Info "Cleaning up..."
            docker-compose -f docker-compose.base.yml -f $EnvFile down -v --rmi all
            if ($LASTEXITCODE -eq 0) {
                Log-Success "Cleanup completed"
            } else {
                Log-Error "Cleanup failed"
                exit 1
            }
        } else {
            Log-Info "Cleanup cancelled"
        }
    }
}
