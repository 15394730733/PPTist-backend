#!/bin/bash
# PPTist Backend Deployment Script
# Usage: ./scripts/deploy.sh [environment] [command]
#   environment: dev | test | prod (default: dev)
#   command: build | up | down | restart | logs | status (default: up)

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
ENV=${1:-dev}
COMMAND=${2:-up}

# Validate environment
case $ENV in
    dev|development)
        ENV_FILE="docker-compose.dev.yml"
        log_info "Using development environment"
        ;;
    test|testing)
        ENV_FILE="docker-compose.test.yml"
        log_info "Using test environment"
        ;;
    prod|production)
        ENV_FILE="docker-compose.prod.yml"
        log_info "Using production environment"
        ;;
    *)
        log_error "Invalid environment: $ENV"
        echo "Usage: $0 [dev|test|prod] [build|up|down|restart|logs|status]"
        exit 1
        ;;
esac

# Check if .env file exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
    log_warning ".env file not found, creating from .env.example"
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    log_info "Please edit .env file with your configuration"
fi

# Change to project directory
cd "$PROJECT_DIR"

# Execute command
case $COMMAND in
    build)
        log_info "Building Docker images for $ENV environment..."
        docker-compose -f docker-compose.base.yml -f "$ENV_FILE" build
        log_success "Build completed"
        ;;
    up)
        log_info "Starting services for $ENV environment..."
        docker-compose -f docker-compose.base.yml -f "$ENV_FILE" up -d
        log_success "Services started"
        log_info "Use '$0 $ENV logs' to view logs"
        ;;
    down)
        log_info "Stopping services for $ENV environment..."
        docker-compose -f docker-compose.base.yml -f "$ENV_FILE" down
        log_success "Services stopped"
        ;;
    restart)
        log_info "Restarting services for $ENV environment..."
        docker-compose -f docker-compose.base.yml -f "$ENV_FILE" restart
        log_success "Services restarted"
        ;;
    logs)
        log_info "Showing logs for $ENV environment (Ctrl+C to exit)..."
        docker-compose -f docker-compose.base.yml -f "$ENV_FILE" logs -f
        ;;
    status)
        log_info "Service status for $ENV environment:"
        docker-compose -f docker-compose.base.yml -f "$ENV_FILE" ps
        ;;
    health)
        log_info "Checking service health..."
        docker-compose -f docker-compose.base.yml -f "$ENV_FILE" exec app wget -q -O- http://localhost:3000/health || log_error "Health check failed"
        ;;
    clean)
        log_warning "This will remove all containers, volumes, and images for $ENV environment"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Cleaning up..."
            docker-compose -f docker-compose.base.yml -f "$ENV_FILE" down -v --rmi all
            log_success "Cleanup completed"
        else
            log_info "Cleanup cancelled"
        fi
        ;;
    *)
        log_error "Invalid command: $COMMAND"
        echo "Available commands: build, up, down, restart, logs, status, health, clean"
        exit 1
        ;;
esac
