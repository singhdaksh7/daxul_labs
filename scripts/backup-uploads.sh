#!/bin/bash
# DAXUL LABS — Automated Uploads & Artwork Backup Script
# Cron Schedule: 30 2 * * * /app/scripts/backup-uploads.sh >> /var/log/daxul_uploads_backup.log 2>&1

set -e

BACKUP_DIR="/var/backups/daxul/uploads"
UPLOADS_SRC="/var/lib/docker/volumes/daxul_labs_uploads_data/_data" # Or host path /app/uploads
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/daxul_uploads_${DATE}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "=========================================="
echo "Starting Uploads & Customer Artwork Backup: ${DATE}"

if [ -d "${UPLOADS_SRC}" ]; then
  tar -czf "${BACKUP_FILE}" -C "${UPLOADS_SRC}" .
  echo "✓ Uploads Backup SUCCESSFUL: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
else
  # Fallback to local ./uploads directory
  if [ -d "./uploads" ]; then
    tar -czf "${BACKUP_FILE}" -C "./uploads" .
    echo "✓ Uploads Backup SUCCESSFUL (from ./uploads): ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
  else
    echo "⚠️ Warning: Uploads directory not found, skipping archive creation."
  fi
fi

# Retention Policy: Clean archives older than 30 days
find "${BACKUP_DIR}" -type f -name "daxul_uploads_*.tar.gz" -mtime +30 -delete
echo "✓ Cleaned upload archives older than 30 days"

# OFF-SITE ENCRYPTED BACKUP COPY (RECOMMENDED FOR PRODUCTION):
# rclone copy "${BACKUP_FILE}" remote:daxul-backups-vault/uploads/
# aws s3 cp "${BACKUP_FILE}" s3://daxul-backups-vault/uploads/ --sse AES256

echo "=========================================="
