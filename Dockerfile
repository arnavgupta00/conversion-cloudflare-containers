# Use Node.js Alpine for smaller image size
FROM node:18-alpine

# Install FFmpeg with AMR codec support
RUN apk add --no-cache \
    ffmpeg \
    && ffmpeg -codecs 2>/dev/null | grep amr || echo "AMR codec check"

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application files
COPY container_src/ ./

# Create temp directory and set permissions
RUN mkdir -p /tmp/audio-converter && \
    chown -R nodejs:nodejs /app /tmp/audio-converter

# Switch to non-root user
USER nodejs

# Expose port 8080
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production \
    PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the application
CMD ["node", "server.js"]