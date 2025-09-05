#!/bin/bash
# Deployment script for Handwork Marketplace
# Supports staging and production deployments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/deploy.log"

# Default values
ENVIRONMENT="staging"
SKIP_TESTS=false
SKIP_BACKUP=false
ROLLBACK=false
HEALTH_CHECK_TIMEOUT=300

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}" | tee -a "$LOG_FILE"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV    Deployment environment (staging|production) [default: staging]
    -s, --skip-tests        Skip running tests before deployment
    -b, --skip-backup       Skip database backup before deployment
    -r, --rollback          Rollback to previous deployment
    -t, --timeout SECONDS   Health check timeout in seconds [default: 300]
    -h, --help              Show this help message

Examples:
    $0 --environment production
    $0 --environment staging --skip-tests
    $0 --rollback --environment production
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        -t|--timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    print_status "$RED" "ERROR: Environment must be 'staging' or 'production'"
    exit 1
fi

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

print_status "$BLUE" "Starting deployment to $ENVIRONMENT environment"

# Function to run tests
run_tests() {
    print_status "$YELLOW" "Running tests..."
    
    # Backend tests
    cd "$PROJECT_DIR/backend"
    if ! python -m pytest --tb=short; then
        print_status "$RED" "Backend tests failed"
        return 1
    fi
    
    # Admin web tests
    cd "$PROJECT_DIR/admin-web"
    if ! npm test -- --watchAll=false; then
        print_status "$RED" "Admin web tests failed"
        return 1
    fi
    
    # Mobile tests
    cd "$PROJECT_DIR/mobile"
    if ! npm test -- --watchAll=false; then
        print_status "$RED" "Mobile tests failed"
        return 1
    fi
    
    cd "$PROJECT_DIR"
    print_status "$GREEN" "All tests passed"
    return 0
}

# Function to create database backup
create_backup() {
    print_status "$YELLOW" "Creating database backup..."
    
    cd "$PROJECT_DIR/backend"
    if python scripts/backup_database.py --action backup --compress; then
        print_status "$GREEN" "Database backup created successfully"
        return 0
    else
        print_status "$RED" "Database backup failed"
        return 1
    fi
}

# Function to deploy application
deploy_application() {
    print_status "$YELLOW" "Deploying application..."
    
    # Pull latest changes
    git pull origin main
    
    # Build and deploy using Docker Compose
    local compose_file="docker-compose.${ENVIRONMENT}.yml"
    
    if [[ ! -f "$compose_file" ]]; then
        print_status "$RED" "Compose file not found: $compose_file"
        return 1
    fi
    
    # Stop existing containers
    docker-compose -f "$compose_file" down
    
    # Pull latest images
    docker-compose -f "$compose_file" pull
    
    # Start new containers
    if docker-compose -f "$compose_file" up -d; then
        print_status "$GREEN" "Application deployed successfully"
        return 0
    else
        print_status "$RED" "Application deployment failed"
        return 1
    fi
}

# Function to run database migrations
run_migrations() {
    print_status "$YELLOW" "Running database migrations..."
    
    cd "$PROJECT_DIR/backend"
    if python scripts/migrate_database.py --action migrate; then
        print_status "$GREEN" "Database migrations completed"
        return 0
    else
        print_status "$RED" "Database migrations failed"
        return 1
    fi
}

# Function to perform health checks
health_check() {
    print_status "$YELLOW" "Performing health checks..."
    
    local health_url
    if [[ "$ENVIRONMENT" == "production" ]]; then
        health_url="https://api.handworkmarketplace.com/health"
    else
        health_url="https://staging-api.handworkmarketplace.com/health"
    fi
    
    local timeout=$HEALTH_CHECK_TIMEOUT
    local interval=10
    local elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        if curl -f -s "$health_url" > /dev/null; then
            print_status "$GREEN" "Health check passed"
            return 0
        fi
        
        print_status "$YELLOW" "Health check failed, retrying in ${interval}s... (${elapsed}/${timeout}s elapsed)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    print_status "$RED" "Health check failed after ${timeout}s timeout"
    return 1
}

# Function to rollback deployment
rollback_deployment() {
    print_status "$YELLOW" "Rolling back deployment..."
    
    # Get previous image tags from Docker
    local compose_file="docker-compose.${ENVIRONMENT}.yml"
    
    # Stop current containers
    docker-compose -f "$compose_file" down
    
    # Restore from backup (if available)
    local latest_backup=$(find "$PROJECT_DIR/backend/backups" -name "handwork_marketplace_backup_*.db*" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [[ -n "$latest_backup" ]]; then
        print_status "$YELLOW" "Restoring database from backup: $latest_backup"
        cd "$PROJECT_DIR/backend"
        python scripts/backup_database.py --action restore --restore-file "$latest_backup"
    fi
    
    # Start containers with previous configuration
    # Note: In a real scenario, you'd want to tag and track previous deployments
    docker-compose -f "$compose_file" up -d
    
    print_status "$GREEN" "Rollback completed"
}

# Function to send deployment notification
send_notification() {
    local status=$1
    local message=$2
    
    # Send Slack notification if webhook is configured
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local color
        case $status in
            "success") color="good" ;;
            "failure") color="danger" ;;
            *) color="warning" ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"Deployment $status\",\"text\":\"$message\",\"fields\":[{\"title\":\"Environment\",\"value\":\"$ENVIRONMENT\",\"short\":true}]}]}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
    
    # Send email notification if configured
    if [[ -n "$DEPLOYMENT_EMAIL" ]]; then
        echo "$message" | mail -s "Deployment $status - $ENVIRONMENT" "$DEPLOYMENT_EMAIL" || true
    fi
}

# Main deployment process
main() {
    local start_time=$(date +%s)
    
    if [[ "$ROLLBACK" == "true" ]]; then
        rollback_deployment
        if health_check; then
            print_status "$GREEN" "Rollback completed successfully"
            send_notification "success" "Rollback to $ENVIRONMENT completed successfully"
            exit 0
        else
            print_status "$RED" "Rollback failed health check"
            send_notification "failure" "Rollback to $ENVIRONMENT failed health check"
            exit 1
        fi
    fi
    
    # Pre-deployment checks
    if [[ "$SKIP_TESTS" != "true" ]]; then
        if ! run_tests; then
            print_status "$RED" "Deployment aborted due to test failures"
            send_notification "failure" "Deployment to $ENVIRONMENT aborted due to test failures"
            exit 1
        fi
    fi
    
    # Create backup
    if [[ "$SKIP_BACKUP" != "true" ]]; then
        if ! create_backup; then
            print_status "$RED" "Deployment aborted due to backup failure"
            send_notification "failure" "Deployment to $ENVIRONMENT aborted due to backup failure"
            exit 1
        fi
    fi
    
    # Deploy application
    if ! deploy_application; then
        print_status "$RED" "Deployment failed"
        send_notification "failure" "Deployment to $ENVIRONMENT failed"
        exit 1
    fi
    
    # Run migrations
    if ! run_migrations; then
        print_status "$RED" "Migration failed, rolling back..."
        rollback_deployment
        send_notification "failure" "Deployment to $ENVIRONMENT failed during migrations, rolled back"
        exit 1
    fi
    
    # Health checks
    if ! health_check; then
        print_status "$RED" "Health check failed, rolling back..."
        rollback_deployment
        send_notification "failure" "Deployment to $ENVIRONMENT failed health check, rolled back"
        exit 1
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_status "$GREEN" "Deployment completed successfully in ${duration}s"
    send_notification "success" "Deployment to $ENVIRONMENT completed successfully in ${duration}s"
}

# Run main function
main "$@"