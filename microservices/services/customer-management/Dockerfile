# Customer Management Service Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Set environment variables
ENV NODE_ENV=production
ENV SERVICE_NAME=customer-management
ENV SERVICE_PORT=3000

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S customerservice -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R customerservice:nodejs /app

# Switch to non-root user
USER customerservice

# Start the application
CMD ["node", "index.js"]