#!/bin/bash

# ============================================
# Database Backup Script
# OpenTable Clone Platform
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Load environment variables
if [ -f "${PROJECT_ROOT}/.env" ]; then
    source "${PROJECT_ROOT}/.env"
fi

# Database configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-opentable}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-}

# S3 Configuration (optional)
S3_BUCKET=${BACKUP_S3_BUCKET:-}
S3_PREFIX=${BACKUP_S3_PREFIX:-database-backups}

# Logging functions
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

# Create backup directory if it doesn't exist
ensure_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for pg_dump
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump is not installed. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Check for gzip
    if ! command -v gzip &> /dev/null; then
        log_error "gzip is not installed."
        exit 1
    fi
    
    # Check AWS CLI if S3 bucket is configured
    if [ -n "$S3_BUCKET" ] && ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not installed. S3 backup will be skipped."
        S3_BUCKET=""
    fi
    
    log_success "Prerequisites check passed"
}

# Create database backup
create_backup() {
    local backup_type=${1:-full}
    local backup_file="${BACKUP_DIR}/opentable_${backup_type}_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    log_info "Starting ${backup_type} backup..."
    
    # Set password in environment
    export PGPASSWORD="$DB_PASSWORD"
    
    case $backup_type in
        full)
            # Full backup with all data
            log_info "Creating full database backup..."
            pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --format=plain \
                --no-owner \
                --no-privileges \
                --if-exists \
                --clean \
                -f "$backup_file"
            ;;
        schema)
            # Schema only (no data)
            log_info "Creating schema-only backup..."
            pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --format=plain \
                --schema-only \
                --no-owner \
                --no-privileges \
                -f "$backup_file"
            ;;
        data)
            # Data only
            log_info "Creating data-only backup..."
            pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --format=plain \
                --data-only \
                --no-owner \
                --no-privileges \
                -f "$backup_file"
            ;;
        custom)
            # Custom format (recommended for large databases)
            backup_file="${BACKUP_DIR}/opentable_${backup_type}_${TIMESTAMP}.dump"
            compressed_file="$backup_file" # Custom format is already compressed
            log_info "Creating custom format backup..."
            pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --format=custom \
                --compress=9 \
                --no-owner \
                --no-privileges \
                -f "$backup_file"
            ;;
        *)
            log_error "Unknown backup type: $backup_type"
            exit 1
            ;;
    esac
    
    # Unset password
    unset PGPASSWORD
    
    # Check if backup was successful
    if [ ! -f "$backup_file" ]; then
        log_error "Backup failed - no file created"
        exit 1
    fi
    
    # Get file size
    local file_size=$(du -h "$backup_file" | cut -f1)
    log_info "Backup file created: $backup_file ($file_size)"
    
    # Compress if not custom format
    if [ "$backup_type" != "custom" ]; then
        log_info "Compressing backup..."
        gzip -9 "$backup_file"
        
        if [ -f "$compressed_file" ]; then
            local compressed_size=$(du -h "$compressed_file" | cut -f1)
            log_success "Backup compressed: $compressed_file ($compressed_size)"
        else
            log_error "Compression failed"
            exit 1
        fi
    fi
    
    # Create checksum
    local checksum_file="${compressed_file}.sha256"
    sha256sum "$compressed_file" > "$checksum_file"
    log_info "Checksum created: $checksum_file"
    
    # Upload to S3 if configured
    if [ -n "$S3_BUCKET" ]; then
        upload_to_s3 "$compressed_file" "$checksum_file"
    fi
    
    echo "$compressed_file"
}

# Upload backup to S3
upload_to_s3() {
    local backup_file="$1"
    local checksum_file="$2"
    local s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/$(basename "$backup_file")"
    
    log_info "Uploading to S3: $s3_path"
    
    # Upload backup file
    aws s3 cp "$backup_file" "$s3_path" --storage-class STANDARD_IA
    
    # Upload checksum
    aws s3 cp "$checksum_file" "${s3_path}.sha256" --storage-class STANDARD_IA
    
    log_success "Backup uploaded to S3"
}

# Clean up old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "opentable_*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "opentable_*.dump" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "*.sha256" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # S3 cleanup (if configured)
    if [ -n "$S3_BUCKET" ]; then
        log_info "Cleaning up old S3 backups..."
        # List and delete old backups from S3
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_name=$(echo "$line" | awk '{print $4}')
            
            if [ -n "$file_date" ] && [ -n "$file_name" ]; then
                local days_old=$(( ($(date +%s) - $(date -d "$file_date" +%s)) / 86400 ))
                if [ $days_old -gt $RETENTION_DAYS ]; then
                    aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${file_name}"
                    log_info "Deleted old S3 backup: $file_name"
                fi
            fi
        done 2>/dev/null || true
    fi
    
    log_success "Cleanup completed"
}

# List available backups
list_backups() {
    log_info "Available local backups:"
    echo ""
    
    if [ -d "$BACKUP_DIR" ]; then
        ls -lh "$BACKUP_DIR"/*.gz "$BACKUP_DIR"/*.dump 2>/dev/null | while read -r line; do
            echo "  $line"
        done
        
        if [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
            echo "  No backups found"
        fi
    else
        echo "  Backup directory does not exist"
    fi
    
    echo ""
    
    # List S3 backups if configured
    if [ -n "$S3_BUCKET" ]; then
        log_info "Available S3 backups:"
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" 2>/dev/null | grep -E '\.(gz|dump)$' | while read -r line; do
            echo "  $line"
        done || echo "  No S3 backups found or S3 not accessible"
    fi
}

# Print usage
print_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  backup [type]    Create a database backup"
    echo "                   Types: full (default), schema, data, custom"
    echo "  list             List available backups"
    echo "  cleanup          Remove old backups (older than ${RETENTION_DAYS} days)"
    echo "  help             Show this help message"
    echo ""
    echo "Options:"
    echo "  --db-host        Database host (default: localhost)"
    echo "  --db-port        Database port (default: 5432)"
    echo "  --db-name        Database name (default: opentable)"
    echo "  --db-user        Database user (default: postgres)"
    echo "  --retention      Retention days (default: 30)"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
    echo "  BACKUP_S3_BUCKET, BACKUP_S3_PREFIX"
    echo "  BACKUP_RETENTION_DAYS"
    echo ""
    echo "Examples:"
    echo "  $0 backup              # Create full backup"
    echo "  $0 backup schema       # Create schema-only backup"
    echo "  $0 backup custom       # Create custom format backup (recommended)"
    echo "  $0 list                # List all backups"
    echo "  $0 cleanup             # Remove old backups"
}

# Main execution
main() {
    local command=${1:-backup}
    shift 2>/dev/null || true
    
    case $command in
        backup)
            check_prerequisites
            ensure_backup_dir
            local backup_type=${1:-full}
            local backup_file=$(create_backup "$backup_type")
            log_success "Backup completed: $backup_file"
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        help|--help|-h)
            print_usage
            ;;
        *)
            log_error "Unknown command: $command"
            print_usage
            exit 1
            ;;
    esac
}

# Run main
main "$@"

