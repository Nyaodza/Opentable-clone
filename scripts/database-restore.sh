#!/bin/bash

# ============================================
# Database Restore Script
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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for psql
    if ! command -v psql &> /dev/null; then
        log_error "psql is not installed. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Check for pg_restore (for custom format)
    if ! command -v pg_restore &> /dev/null; then
        log_error "pg_restore is not installed. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Check for gunzip
    if ! command -v gunzip &> /dev/null; then
        log_error "gunzip is not installed."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# List available backups for selection
select_backup() {
    local backups=()
    local i=1
    
    log_info "Available backups:"
    echo ""
    
    # List local backups
    if [ -d "$BACKUP_DIR" ]; then
        for file in "$BACKUP_DIR"/opentable_*.{gz,dump} 2>/dev/null; do
            if [ -f "$file" ]; then
                local size=$(du -h "$file" | cut -f1)
                local date=$(stat -c %y "$file" 2>/dev/null || stat -f %Sm "$file" 2>/dev/null)
                echo "  [$i] $(basename "$file") ($size) - $date"
                backups+=("$file")
                ((i++))
            fi
        done
    fi
    
    if [ ${#backups[@]} -eq 0 ]; then
        log_error "No backup files found in $BACKUP_DIR"
        exit 1
    fi
    
    echo ""
    read -p "Select backup number to restore (1-${#backups[@]}): " selection
    
    if [[ ! "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups[@]} ]; then
        log_error "Invalid selection"
        exit 1
    fi
    
    echo "${backups[$((selection-1))]}"
}

# Download backup from S3
download_from_s3() {
    local backup_name="$1"
    local local_path="${BACKUP_DIR}/${backup_name}"
    
    log_info "Downloading backup from S3..."
    
    aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}/${backup_name}" "$local_path"
    
    # Download and verify checksum
    if aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}/${backup_name}.sha256" "${local_path}.sha256" 2>/dev/null; then
        log_info "Verifying checksum..."
        if sha256sum -c "${local_path}.sha256" &>/dev/null; then
            log_success "Checksum verified"
        else
            log_error "Checksum verification failed!"
            exit 1
        fi
    else
        log_warning "No checksum file found, skipping verification"
    fi
    
    echo "$local_path"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log_info "Verifying backup integrity..."
    
    # Check if checksum file exists
    local checksum_file="${backup_file}.sha256"
    if [ -f "$checksum_file" ]; then
        if sha256sum -c "$checksum_file" &>/dev/null; then
            log_success "Checksum verified"
        else
            log_error "Checksum verification failed!"
            return 1
        fi
    else
        log_warning "No checksum file found, skipping verification"
    fi
    
    # Basic file integrity check
    if [[ "$backup_file" == *.gz ]]; then
        if gzip -t "$backup_file" 2>/dev/null; then
            log_success "Gzip integrity check passed"
        else
            log_error "Backup file is corrupted"
            return 1
        fi
    fi
    
    return 0
}

# Create a backup before restore (safety measure)
create_pre_restore_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/opentable_pre_restore_${timestamp}.sql.gz"
    
    log_info "Creating pre-restore safety backup..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-privileges 2>/dev/null | gzip > "$backup_file"
    
    unset PGPASSWORD
    
    if [ -f "$backup_file" ]; then
        log_success "Pre-restore backup created: $backup_file"
        echo "$backup_file"
    else
        log_warning "Could not create pre-restore backup (database may not exist)"
    fi
}

# Restore from SQL dump (gzipped)
restore_sql_dump() {
    local backup_file="$1"
    local temp_file=""
    
    log_info "Restoring from SQL dump: $(basename "$backup_file")"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Decompress if gzipped
    if [[ "$backup_file" == *.gz ]]; then
        temp_file="${backup_file%.gz}"
        log_info "Decompressing backup..."
        gunzip -c "$backup_file" > "$temp_file"
        backup_file="$temp_file"
    fi
    
    # Restore using psql
    log_info "Executing SQL restore..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --set ON_ERROR_STOP=off \
        -f "$backup_file"
    
    local exit_code=$?
    
    unset PGPASSWORD
    
    # Cleanup temp file
    if [ -n "$temp_file" ] && [ -f "$temp_file" ]; then
        rm "$temp_file"
    fi
    
    return $exit_code
}

# Restore from custom format dump
restore_custom_dump() {
    local backup_file="$1"
    local jobs=${2:-4}
    
    log_info "Restoring from custom format dump: $(basename "$backup_file")"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # pg_restore with parallel jobs for faster restore
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --jobs=$jobs \
        "$backup_file"
    
    local exit_code=$?
    
    unset PGPASSWORD
    
    return $exit_code
}

# Main restore function
restore_database() {
    local backup_file="$1"
    local skip_backup=${2:-false}
    local skip_verify=${3:-false}
    
    # Verify backup if not skipped
    if [ "$skip_verify" != "true" ]; then
        if ! verify_backup "$backup_file"; then
            log_error "Backup verification failed. Aborting restore."
            exit 1
        fi
    fi
    
    # Create pre-restore backup if not skipped
    if [ "$skip_backup" != "true" ]; then
        create_pre_restore_backup
    fi
    
    # Determine restore method based on file extension
    if [[ "$backup_file" == *.dump ]]; then
        restore_custom_dump "$backup_file"
    else
        restore_sql_dump "$backup_file"
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "Database restore completed successfully!"
    else
        log_warning "Restore completed with some errors (exit code: $exit_code)"
        log_info "This is often normal due to 'does not exist' errors when dropping objects"
    fi
    
    return 0
}

# Restore specific tables only
restore_tables() {
    local backup_file="$1"
    shift
    local tables=("$@")
    
    if [[ "$backup_file" != *.dump ]]; then
        log_error "Table-specific restore requires custom format (.dump) backup"
        exit 1
    fi
    
    log_info "Restoring specific tables: ${tables[*]}"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    local table_args=""
    for table in "${tables[@]}"; do
        table_args="$table_args -t $table"
    done
    
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner \
        --no-privileges \
        --data-only \
        $table_args \
        "$backup_file"
    
    unset PGPASSWORD
    
    log_success "Table restore completed"
}

# Restore to a point in time (requires WAL archiving)
point_in_time_restore() {
    local target_time="$1"
    
    log_warning "Point-in-time recovery requires:"
    log_warning "  1. PostgreSQL configured with WAL archiving"
    log_warning "  2. A base backup and WAL files"
    log_warning "  3. Recovery configuration in postgresql.conf"
    
    log_info "Target time: $target_time"
    log_info "Please configure recovery manually for PITR"
    
    # This is a placeholder - PITR setup is complex and environment-specific
    echo ""
    echo "Example recovery configuration:"
    echo "  restore_command = 'cp /path/to/wal/%f %p'"
    echo "  recovery_target_time = '$target_time'"
    echo "  recovery_target_action = 'promote'"
}

# Print usage
print_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  restore [file]      Restore from specified backup file"
    echo "  select              Interactively select and restore a backup"
    echo "  verify [file]       Verify backup integrity"
    echo "  list                List available backups"
    echo "  tables [file] t1..  Restore specific tables from backup"
    echo "  s3 [name]           Download and restore from S3"
    echo "  help                Show this help message"
    echo ""
    echo "Options:"
    echo "  --skip-backup       Don't create pre-restore safety backup"
    echo "  --skip-verify       Don't verify backup before restore"
    echo "  --db-host           Database host (default: localhost)"
    echo "  --db-port           Database port (default: 5432)"
    echo "  --db-name           Database name (default: opentable)"
    echo "  --db-user           Database user (default: postgres)"
    echo ""
    echo "Examples:"
    echo "  $0 select                              # Interactive selection"
    echo "  $0 restore backup.sql.gz              # Restore specific file"
    echo "  $0 restore backup.dump --skip-verify  # Skip verification"
    echo "  $0 tables backup.dump users reviews   # Restore specific tables"
    echo "  $0 s3 opentable_full_20231201.sql.gz  # Restore from S3"
    echo "  $0 verify backup.sql.gz               # Verify only"
}

# Main execution
main() {
    local command=${1:-select}
    shift 2>/dev/null || true
    
    # Parse flags
    local skip_backup=false
    local skip_verify=false
    local positional_args=()
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                skip_backup=true
                shift
                ;;
            --skip-verify)
                skip_verify=true
                shift
                ;;
            --db-host)
                DB_HOST="$2"
                shift 2
                ;;
            --db-port)
                DB_PORT="$2"
                shift 2
                ;;
            --db-name)
                DB_NAME="$2"
                shift 2
                ;;
            --db-user)
                DB_USER="$2"
                shift 2
                ;;
            *)
                positional_args+=("$1")
                shift
                ;;
        esac
    done
    
    case $command in
        restore)
            check_prerequisites
            if [ ${#positional_args[@]} -eq 0 ]; then
                log_error "Please specify a backup file to restore"
                exit 1
            fi
            local backup_file="${positional_args[0]}"
            if [ ! -f "$backup_file" ]; then
                # Try looking in backup directory
                backup_file="${BACKUP_DIR}/${positional_args[0]}"
            fi
            if [ ! -f "$backup_file" ]; then
                log_error "Backup file not found: ${positional_args[0]}"
                exit 1
            fi
            restore_database "$backup_file" "$skip_backup" "$skip_verify"
            ;;
        select)
            check_prerequisites
            local backup_file=$(select_backup)
            restore_database "$backup_file" "$skip_backup" "$skip_verify"
            ;;
        verify)
            if [ ${#positional_args[@]} -eq 0 ]; then
                log_error "Please specify a backup file to verify"
                exit 1
            fi
            local backup_file="${positional_args[0]}"
            if [ ! -f "$backup_file" ]; then
                backup_file="${BACKUP_DIR}/${positional_args[0]}"
            fi
            if verify_backup "$backup_file"; then
                log_success "Backup verification passed: $backup_file"
            else
                log_error "Backup verification failed: $backup_file"
                exit 1
            fi
            ;;
        list)
            log_info "Available backups in $BACKUP_DIR:"
            ls -lh "$BACKUP_DIR"/*.{gz,dump} 2>/dev/null || echo "  No backups found"
            if [ -n "$S3_BUCKET" ]; then
                echo ""
                log_info "S3 backups:"
                aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" 2>/dev/null || echo "  S3 not accessible"
            fi
            ;;
        tables)
            check_prerequisites
            if [ ${#positional_args[@]} -lt 2 ]; then
                log_error "Please specify backup file and at least one table"
                exit 1
            fi
            local backup_file="${positional_args[0]}"
            local tables=("${positional_args[@]:1}")
            restore_tables "$backup_file" "${tables[@]}"
            ;;
        s3)
            check_prerequisites
            if [ -z "$S3_BUCKET" ]; then
                log_error "S3_BUCKET not configured"
                exit 1
            fi
            if [ ${#positional_args[@]} -eq 0 ]; then
                log_error "Please specify S3 backup name"
                exit 1
            fi
            local backup_name="${positional_args[0]}"
            local local_file=$(download_from_s3 "$backup_name")
            restore_database "$local_file" "$skip_backup" "$skip_verify"
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

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Run main
main "$@"

