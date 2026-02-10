# Multi-stage build for PPTX Conversion Service
# Optimized for production deployment with minimal image size and security best practices

# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    pixman-dev \
    pango-dev \
    libjpeg-turbo-dev \
    libffi-dev

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci && \
    npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package and config files
COPY package.json package-lock.json* tsconfig.json ./

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build && \
    # Remove source maps to reduce image size (optional, uncomment if needed)
    # find ./dist -name "*.map" -delete
    # Verify build output
    ls -lah dist/

# Stage 3: Production
FROM node:20-alpine AS production

# Add metadata labels
LABEL maintainer="PPTist Team <support@example.com>"
LABEL description="PPTX to PPTist JSON Conversion Service"
LABEL version="1.0.0"
LABEL org.opencontainers.image.title="PPTX Conversion Service"
LABEL org.opencontainers.image.description="Convert PowerPoint PPTX files to PPTist JSON format"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/yourusername/PPTist"

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    # Required for some native modules
    python3 \
    # Proper signal handling and zombie process reaping
    dumb-init \
    # For image processing (if needed in future)
    ca-certificates

# Create non-root user with specific UID/GID for consistency
RUN addgroup -g 1001 -S pptist && \
    adduser -S pptist -u 1001 -G pptist

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN NODE_ENV=production npm ci --only=production && \
    npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder --chown=pptist:pptist /app/dist ./dist

# Copy config directory if it exists
COPY --from=builder --chown=pptist:pptist /app/config ./config

# Create necessary directories with proper permissions
RUN mkdir -p \
    /app/storage \
    /app/temp/uploads \
    /app/temp/pptx-results \
    /app/temp/pptx-media \
    /app/logs && \
    chown -R pptist:pptist /app

# Switch to non-root user
USER pptist

# Expose ports
# 3000: Main API server
# 9090: Metrics endpoint (if using Prometheus)
EXPOSE 3000
EXPOSE 9090

# Health check with proper endpoint
# Uses curl-like approach with Node.js to avoid additional dependencies
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set default environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    # Security settings
    NODE_OPTIONS="--max-old-space-size=2048" \
    # Logging
    LOG_LEVEL=info \
    # File paths
    STORAGE_DIR=/app/storage \
    TEMP_DIR=/app/temp \
    # Performance
    UV_THREADPOOL_SIZE=4

# Use dumb-init to handle signals properly and reap zombie processes
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/app.js"]
