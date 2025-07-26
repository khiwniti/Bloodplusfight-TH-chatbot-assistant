#!/bin/bash

# Enhanced deployment script for LINE Healthcare Chatbot on Cloudflare Workers
# Supports multiple environments and healthcare-specific configurations

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENTS=("development" "staging" "production")
DEFAULT_ENV="development"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/.deploy-config"

# Healthcare-specific environment variables
HEALTHCARE_VARS=(
    "ENABLE_HEALTHCARE_RESEARCH"
    "HEALTHCARE_RESEARCH_TIMEOUT"
    "HEALTHCARE_MAX_RESULTS"
    "ENABLE_HEALTHCARE_ANALYTICS"
    "HEALTHCARE_PRIVACY_MODE"
    "HEALTHCARE_RETENTION_DAYS"
    "HEALTHCARE_ANONYMIZATION"
    "MEDICAL_RESEARCH_TIMEOUT"
    "MEDICAL_MAX_RESULTS"
    "MEDICAL_CONCURRENT_REQUESTS"
    "ENABLE_MEDICAL_CACHE"
    "MEDICAL_CACHE_TTL"
)

# Required secrets for healthcare deployment
REQUIRED_SECRETS=(
    "CHANNEL_ACCESS_TOKEN"
    "CHANNEL_SECRET"
    "DEEPSEEK_API_KEY"
    "OPENROUTER_API_KEY"
    "ADMIN_API_KEY"
    "WEBHOOK_SECRET"
    "ANALYTICS_SALT"
    "ANONYMIZATION_SALT"
)

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# Show usage information
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] [ENVIRONMENT]

Deploy LINE Healthcare Chatbot to Cloudflare Workers

ENVIRONMENTS:
    development    Development environment (default)
    staging        Staging environment  
    production     Production environment

OPTIONS:
    -h, --help              Show this help message
    -d, --debug             Enable debug output
    -f, --force             Force deployment without confirmation
    -s, --skip-checks       Skip pre-deployment checks
    -m, --migrate           Run database migrations
    -t, --test              Run tests before deployment
    -c, --config            Show current configuration
    --dry-run              Show what would be deployed without deploying
    --setup-secrets        Setup required secrets for environment
    --validate-healthcare   Validate healthcare-specific configuration

EXAMPLES:
    $0                      Deploy to development
    $0 production           Deploy to production
    $0 --test staging       Test and deploy to staging
    $0 --setup-secrets prod Setup production secrets
    $0 --migrate --force production  Migrate and force deploy to production

EOF
}

# Load configuration
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        source "$CONFIG_FILE"
        log_debug "Loaded configuration from $CONFIG_FILE"
    else
        log_debug "No configuration file found at $CONFIG_FILE"
    fi
}

# Save configuration
save_config() {
    cat > "$CONFIG_FILE" << EOF
# Deployment configuration
LAST_DEPLOYED_ENV="${ENVIRONMENT}"
LAST_DEPLOYED_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
LAST_DEPLOYED_VERSION="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
EOF
    log_debug "Saved configuration to $CONFIG_FILE"
}

# Validate environment
validate_environment() {
    local env="$1"
    
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${env} " ]]; then
        log_error "Invalid environment: $env"
        log_error "Valid environments: ${ENVIRONMENTS[*]}"
        exit 1
    fi
    
    log_info "Environment: $env"
}

# Check prerequisites  
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        log_error "Wrangler CLI not found. Install with: npm install -g wrangler"
        exit 1
    fi
    
    # Check wrangler version
    local wrangler_version
    wrangler_version=$(wrangler --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
    log_debug "Wrangler version: $wrangler_version"
    
    # Check if logged in to Cloudflare
    if ! wrangler whoami &> /dev/null; then
        log_error "Not logged in to Cloudflare. Run 'wrangler login' first"
        exit 1
    fi
    
    # Check Node.js version
    local node_version
    node_version=$(node --version)
    log_debug "Node.js version: $node_version"
    
    # Check if package.json exists
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found. Are you in the correct directory?"
        exit 1
    fi
    
    # Check if wrangler.toml exists
    if [[ ! -f "wrangler.toml" ]]; then
        log_error "wrangler.toml not found. Worker configuration missing."
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Validate healthcare configuration
validate_healthcare_config() {
    log_info "Validating healthcare-specific configuration..."
    
    local missing_vars=()
    
    # Check healthcare environment variables
    for var in "${HEALTHCARE_VARS[@]}"; do
        if ! grep -q "^${var}=" "wrangler.toml" 2>/dev/null; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_warn "Missing healthcare environment variables:"
        printf '%s\n' "${missing_vars[@]}" | sed 's/^/  - /'
        log_warn "Some healthcare features may not work properly"
    fi
    
    # Check database migration files
    if [[ -d "migrations" ]]; then
        local migration_count
        migration_count=$(find migrations -name "*.sql" | wc -l)
        log_info "Found $migration_count database migration files"
        
        if [[ ! -f "migrations/0003_healthcare_schema.sql" ]]; then
            log_warn "Healthcare schema migration not found"
        fi
    else
        log_warn "Migrations directory not found"
    fi
    
    # Check source files
    local required_files=(
        "src/services/enhanced-healthcare.js"
        "src/services/medical-research.js" 
        "src/services/healthcare-analytics.js"
        "src/utils/performance.js"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file missing: $file"
            exit 1
        fi
    done
    
    log_info "Healthcare configuration validation passed"
}

# Setup secrets for environment
setup_secrets() {
    local env="$1"
    log_info "Setting up secrets for environment: $env"
    
    for secret in "${REQUIRED_SECRETS[@]}"; do
        echo -n "Enter value for $secret (or press Enter to skip): "
        read -r secret_value
        
        if [[ -n "$secret_value" ]]; then
            echo "$secret_value" | wrangler secret put "$secret" --env "$env"
            log_info "Set secret: $secret"
        else
            log_warn "Skipped secret: $secret"
        fi
    done
    
    log_info "Secret setup completed for $env"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    if [[ -f "package.json" ]] && grep -q '"test"' package.json; then
        npm test
        log_info "Tests passed"
    else
        log_warn "No tests found in package.json"
    fi
}

# Run database migrations
run_migrations() {
    local env="$1"
    log_info "Running database migrations for $env..."
    
    if [[ -d "migrations" ]]; then
        for migration in migrations/*.sql; do
            if [[ -f "$migration" ]]; then
                log_info "Running migration: $(basename "$migration")"
                wrangler d1 execute "line-chatbot-${env}" --file "$migration" --env "$env"
            fi
        done
        log_info "Database migrations completed"
    else
        log_warn "No migrations directory found"
    fi
}

# Build and validate
build_and_validate() {
    log_info "Building and validating..."
    
    # Install dependencies
    if [[ -f "package-lock.json" ]]; then
        npm ci
    else
        npm install
    fi
    
    # Run linting if available
    if grep -q '"lint"' package.json 2>/dev/null; then
        log_info "Running linter..."
        npm run lint
    fi
    
    # Validate wrangler configuration
    wrangler validate
    
    log_info "Build and validation completed"
}

# Deploy to Cloudflare Workers
deploy() {
    local env="$1"
    local force="${2:-false}"
    
    log_info "Deploying to Cloudflare Workers ($env)..."
    
    # Confirmation for production
    if [[ "$env" == "production" && "$force" != "true" ]]; then
        echo -n "Are you sure you want to deploy to PRODUCTION? (yes/no): "
        read -r confirmation
        
        if [[ "$confirmation" != "yes" ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Deploy with wrangler
    local deploy_args=("deploy")
    
    if [[ "$env" != "development" ]]; then
        deploy_args+=("--env" "$env")
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        deploy_args+=("--dry-run")
        log_info "Dry run mode - showing what would be deployed"
    fi
    
    wrangler "${deploy_args[@]}"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        log_info "Deployment completed successfully!"
        
        # Save deployment info
        save_config
        
        # Show deployment info
        show_deployment_info "$env"
    fi
}

# Show deployment information
show_deployment_info() {
    local env="$1"
    
    cat << EOF

${GREEN}=== Deployment Information ===${NC}
Environment: $env
Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
Deployed by: $(whoami)

${BLUE}Healthcare Features:${NC}
✓ Enhanced HIV/STDs information service
✓ Medical research and web scraping
✓ Privacy-compliant analytics
✓ Real-time health monitoring
✓ Multi-language support (EN/TH)

${YELLOW}Next Steps:${NC}
1. Test the webhook endpoint
2. Verify healthcare features
3. Monitor analytics dashboard
4. Check error logs if needed

${BLUE}Useful Commands:${NC}
- View logs: wrangler tail --env $env
- Check analytics: wrangler d1 execute line-chatbot-$env --command "SELECT * FROM healthcare_analytics_summary LIMIT 10" --env $env
- Update secrets: wrangler secret put SECRET_NAME --env $env

EOF
}

# Show current configuration
show_config() {
    cat << EOF
${GREEN}=== Current Configuration ===${NC}

Environment Variables from wrangler.toml:
$(grep -E "^[A-Z_]+ =" wrangler.toml | head -20)

Healthcare Configuration:
$(for var in "${HEALTHCARE_VARS[@]}"; do
    if grep -q "^${var}=" "wrangler.toml" 2>/dev/null; then
        grep "^${var}=" "wrangler.toml"
    else
        echo "$var = NOT_SET"
    fi
done)

Last Deployment:
$(if [[ -f "$CONFIG_FILE" ]]; then cat "$CONFIG_FILE"; else echo "No previous deployments"; fi)

EOF
}

# Main deployment function
main() {
    local ENVIRONMENT="$DEFAULT_ENV"
    local FORCE="false"
    local SKIP_CHECKS="false"
    local RUN_MIGRATIONS="false"
    local RUN_TESTS="false"
    local SETUP_SECRETS_MODE="false"
    local SHOW_CONFIG="false"
    local VALIDATE_HEALTHCARE="false"
    DRY_RUN="false"
    DEBUG="false"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -d|--debug)
                DEBUG="true"
                shift
                ;;
            -f|--force)
                FORCE="true"
                shift
                ;;
            -s|--skip-checks)
                SKIP_CHECKS="true"
                shift
                ;;
            -m|--migrate)
                RUN_MIGRATIONS="true"
                shift
                ;;
            -t|--test)
                RUN_TESTS="true"
                shift
                ;;
            -c|--config)
                SHOW_CONFIG="true"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --setup-secrets)
                SETUP_SECRETS_MODE="true"
                shift
                ;;
            --validate-healthcare)
                VALIDATE_HEALTHCARE="true"
                shift
                ;;
            development|staging|production)
                ENVIRONMENT="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Load existing configuration
    load_config
    
    # Show configuration if requested
    if [[ "$SHOW_CONFIG" == "true" ]]; then
        show_config
        exit 0
    fi
    
    # Setup secrets mode
    if [[ "$SETUP_SECRETS_MODE" == "true" ]]; then
        validate_environment "$ENVIRONMENT"
        setup_secrets "$ENVIRONMENT"
        exit 0
    fi
    
    # Validate healthcare configuration only
    if [[ "$VALIDATE_HEALTHCARE" == "true" ]]; then
        validate_healthcare_config
        exit 0
    fi
    
    # Main deployment flow
    log_info "Starting deployment process..."
    log_info "Target environment: $ENVIRONMENT"
    
    # Validate environment
    validate_environment "$ENVIRONMENT"
    
    # Pre-deployment checks
    if [[ "$SKIP_CHECKS" != "true" ]]; then
        check_prerequisites
        validate_healthcare_config
    fi
    
    # Run tests if requested
    if [[ "$RUN_TESTS" == "true" ]]; then
        run_tests
    fi
    
    # Build and validate
    build_and_validate
    
    # Run migrations if requested
    if [[ "$RUN_MIGRATIONS" == "true" ]]; then
        run_migrations "$ENVIRONMENT"
    fi
    
    # Deploy
    deploy "$ENVIRONMENT" "$FORCE"
    
    log_info "Deployment process completed!"
}

# Run main function with all arguments
main "$@"