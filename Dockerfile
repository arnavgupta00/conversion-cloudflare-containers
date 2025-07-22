# syntax=docker/dockerfile:1

# Use Node.js 18 Alpine as base image
FROM node:18-alpine AS build

# Install FFmpeg and build dependencies
RUN apk add --no-cache \
    ffmpeg \
    ffmpeg-dev \
    build-base \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY container_src/package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy application code
COPY container_src/server.js ./

# Production stage
FROM node:18-alpine AS production

# Install FFmpeg runtime
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /app

# Copy built application from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/package.json ./package.json

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "server.js"]