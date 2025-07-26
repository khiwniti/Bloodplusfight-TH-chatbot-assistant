# API Gateway (NGINX) Dockerfile
FROM nginx:alpine

# Install additional tools
RUN apk add --no-cache curl

# Copy NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Create log directories
RUN mkdir -p /var/log/nginx

# Copy SSL certificates (if using HTTPS)
# COPY certs/ /etc/nginx/certs/

# Set permissions
RUN chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /var/log/nginx

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Expose ports
EXPOSE 80 443

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]