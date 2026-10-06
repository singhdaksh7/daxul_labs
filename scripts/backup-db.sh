#!/bin/bash
# DAXUL LABS — Automated PostgreSQL Backup Script
# Cron Schedule: 0 2 * * * /app/scripts/backup-db.sh >> /var/log/daxul_db_backup.log 2>&1

set -e # Exit immediately if a command exits with a non-zero status

BACKUP_DIR="/var/backups/daxul/postgres"
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/daxul_db_${DATE}.sql.gz"
CONTAINER_NAME="daxul_labs_postgres"
POSTGRES_USER="${POSTGRES_USER:-daxul_prod_user}"
POSTGRES_DB="${POSTGRES_DB:-daxul_labs_production}"

mkdir -p "${BACKUP_DIR}"

echo "=========================================="
echo "Starting PostgreSQL Database Backup: ${DATE}"

# Perform pg_dump inside Docker container and compress with gzip
if docker exec "${CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${BACKUP_FILE}"; then
  echo "✓ Database Backup SUCCESSFUL: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
else
  echo "❌ FATAL: Database backup failed!" >&2
  exit 1
fi

# Retention Policy: Delete local database backups older than 14 days
find "${BACKUP_DIR}" -type f -name "daxul_db_*.sql.gz" -mtime +14 -delete
echo "✓ Cleaned backups older than 14 days"

# OFF-SITE ENCRYPTED BACKUP COPY (RECOMMENDED FOR PRODUCTION):
# Uncomment and configure your off-site destination:
# rclone copy "${BACKUP_FILE}" remote:daxul-backups-vault/postgres/
# aws s3 cp "${BACKUP_FILE}" s3://daxul-backups-vault/postgres/ --sse AES256

echo "=========================================="
