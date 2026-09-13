#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./data/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_DIR/$STAMP"
mkdir -p "$DEST"

if [ -n "${DATABASE_URL:-}" ] && [[ "$DATABASE_URL" == postgres* ]]; then
  pg_dump "$DATABASE_URL" | gzip > "$DEST/db.sql.gz"
else
  cp ./data/ciphervault.db "$DEST/ciphervault.db" 2>/dev/null || true
fi

tar -czf "$DEST/storage.tar.gz" -C ./data storage 2>/dev/null || true
tar -czf "$DEST/keys.tar.gz" -C ./data keys 2>/dev/null || true

find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -mtime +"$RETENTION_DAYS" -exec rm -rf {} +

echo "Backup written to $DEST"
