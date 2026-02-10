#!/bin/bash
# Health Check Script for PPTist Backend
# This script checks the health of the service and reports detailed status

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/health}"
MAX_RETRIES=${MAX_RETRIES:-5}
RETRY_INTERVAL=${RETRY_INTERVAL:-2}

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_http() {
    local url=$1
    local retries=$2
    local interval=$3

    for ((i=1; i<=retries; i++)); do
        log_info "Attempt $i/$retries: Checking $url"

        if command -v curl &> /dev/null; then
            response=$(curl -s -w "\n%{http_code}" "$url" 2>&1)
            http_code=$(echo "$response" | tail -n1)
            body=$(echo "$response" | head -n-1)

            if [ "$http_code" = "200" ]; then
                log_success "HTTP check passed (200 OK)"
                echo "$body" | jq '.' 2>/dev/null || echo "$body"
                return 0
            else
                log_warning "HTTP check failed (status: $http_code)"
            fi
        elif command -v wget &> /dev/null; then
            if wget -q -O- --timeout=5 "$url" &> /dev/null; then
                log_success "HTTP check passed"
                return 0
            else
                log_warning "HTTP check failed"
            fi
        else
            log_error "Neither curl nor wget is available"
            return 1
        fi

        if [ $i -lt $retries ]; then
            log_info "Retrying in ${interval}s..."
            sleep $interval
        fi
    done

    log_error "Health check failed after $retries attempts"
    return 1
}

check_docker() {
    log_info "Checking Docker containers..."

    if ! command -v docker &> /dev/null; then
        log_warning "Docker not found, skipping container check"
        return 0
    fi

    # Check if containers are running
    containers=$(docker ps --filter "name=pptist" --format "{{.Names}}")

    if [ -z "$containers" ]; then
        log_warning "No PPTist containers running"
        return 1
    fi

    log_success "Running containers:"
    echo "$containers" | while read -r container; do
        echo "  - $container"

        # Check container health
        health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
        if [ "$health_status" = "healthy" ]; then
            echo "    Status: ${GREEN}healthy${NC}"
        elif [ "$health_status" = "none" ]; then
            echo "    Status: ${YELLOW}no healthcheck${NC}"
        else
            echo "    Status: ${RED}$health_status${NC}"
        fi
    done
}

check_memory() {
    log_info "Checking memory usage..."

    if command -v free &> /dev/null; then
        mem_info=$(free -h | awk '/^Mem:/ {print $3 "/" $2 " (" $3/$2*100 "%)"}')
        log_success "Memory: $mem_info"
    fi
}

check_disk() {
    log_info "Checking disk space..."

    if command -v df &> /dev/null; then
        disk_info=$(df -h . | tail -1 | awk '{print $3 " used, " $4 " available (" $5 " used)"}')
        log_success "Disk: $disk_info"
    fi
}

# Main health check
echo "========================================"
echo "PPTist Backend Health Check"
echo "========================================"
echo ""

# Check HTTP endpoint
echo "1. HTTP Health Check"
echo "--------------------"
if check_http "$HEALTH_URL" "$MAX_RETRIES" "$RETRY_INTERVAL"; then
    http_status=0
else
    http_status=1
fi
echo ""

# Check Docker containers
echo "2. Docker Container Check"
echo "-------------------------"
check_docker
docker_status=$?
echo ""

# Check memory
echo "3. System Resources"
echo "-------------------"
check_memory
check_disk
echo ""

# Summary
echo "========================================"
echo "Health Check Summary"
echo "========================================"

if [ $http_status -eq 0 ] && [ $docker_status -eq 0 ]; then
    log_success "All health checks passed"
    exit 0
else
    log_error "Some health checks failed"
    exit 1
fi
