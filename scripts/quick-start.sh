#!/bin/bash
# Quick Start Script for PPTist Backend
# This script helps you get started quickly with the PPTist backend service

set -e

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================"
echo "PPTist Backend - Quick Start"
echo -e "========================================${NC}"
echo ""

# Check Docker
echo -e "${BLUE}[1/5]${NC} Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Warning: Docker not found. Please install Docker first.${NC}"
    echo "  Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Warning: Docker Compose not found. Please install Docker Compose first.${NC}"
    echo "  Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker and Docker Compose are installed"
echo ""

# Create .env file
echo -e "${BLUE}[2/5]${NC} Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Created .env file from template"
    echo -e "${YELLOW}Note: You may want to edit .env to customize configuration${NC}"
else
    echo -e "${GREEN}✓${NC} .env file already exists"
fi
echo ""

# Build Docker image
echo -e "${BLUE}[3/5]${NC} Building Docker image..."
if docker build -t pptist-backend:latest . > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker image built successfully"
else
    echo -e "${YELLOW}Warning: Docker build had warnings. Check logs above.${NC}"
fi
echo ""

# Start services
echo -e "${BLUE}[4/5]${NC} Starting services..."
if docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Services started successfully"
else
    echo -e "${YELLOW}Warning: Some services may not have started properly${NC}"
    echo "  Run: docker-compose logs to see what happened"
fi
echo ""

# Wait for health check
echo -e "${BLUE}[5/5]${NC} Waiting for service to be ready..."
for i in {1..10}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Service is ready!"
        echo ""
        echo -e "${GREEN}========================================"
        echo "Setup Complete!"
        echo -e "========================================${NC}"
        echo ""
        echo "Service URLs:"
        echo "  - API:        http://localhost:3000"
        echo "  - Health:     http://localhost:3000/health"
        echo "  - Docs:       http://localhost:3000/docs"
        echo "  - Metrics:    http://localhost:9090/metrics"
        echo "  - Grafana:    http://localhost:3001 (dev only)"
        echo "  - Prometheus: http://localhost:9091 (dev only)"
        echo ""
        echo "Useful Commands:"
        echo "  - View logs:  ./scripts/deploy.sh dev logs"
        echo "  - Stop:       ./scripts/deploy.sh dev down"
        echo "  - Restart:    ./scripts/deploy.sh dev restart"
        echo "  - Status:     ./scripts/deploy.sh dev status"
        echo ""
        exit 0
    fi
    echo -n "."
    sleep 2
done

echo ""
echo -e "${YELLOW}Service is taking longer than expected to start${NC}"
echo "  Check: docker-compose ps"
echo "  Logs:  ./scripts/deploy.sh dev logs"
exit 1
