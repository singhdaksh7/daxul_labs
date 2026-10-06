#!/bin/bash
# DAXUL LABS — PostgreSQL Automated Backup Script for Linux VPS
# Schedule via cron: 0 3 * * * /app/scripts/backup.sh >> /var/log/daxul_backup.log 2>&1

BACKUP_DIR="/var/backups/daxul_postgres"
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/daxul_db_${DATE}.sql.gz"
CONTAINER_NAME="daxul_labs_postgres"
POSTGRES_USER="${POSTGRES_USER:-daxul_user}"
POSTGRES_DB="${POSTGRES_DB:-daxul_labs_db}"

mkdir -p "${BACKUP_DIR}"

echo "=========================================="
echo "Starting PostgreSQL backup: ${DATE}"

# Execute pg_dump inside Docker container and compress
docker exec "${CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
  echo "✓ Backup successful: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
else
  echo "❌ Backup FAILED!"
  exit 1
fi

# Remove local backups older than 14 days
find "${BACKUP_DIR}" -type f -name "daxul_db_*.sql.gz" -mtime +14 -delete
echo "✓ Cleaned local backups older than 14 days"

# OFF-SITE REMOTE BACKUP RECOMMENDATION:
# AWS S3 Sync example:
# aws s3 cp "${BACKUP_FILE}" "s3://daxul-backups-vault/postgres/"
# rclone copy "${BACKUP_FILE}" remote:daxul-backups/
echo "=========================================="
