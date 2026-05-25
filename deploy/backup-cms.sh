#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/xrsimple/server}"
DB_PATH="${DB_PATH:-$APP_ROOT/data/cms.db}"
UPLOADS_PATH="${UPLOADS_PATH:-$APP_ROOT/uploads}"
BACKUP_ROOT="${BACKUP_ROOT:-/srv/xrsimple/backups/daily}"
KEEP_DAYS="${KEEP_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_ROOT"

if [ ! -f "$DB_PATH" ]; then
  echo "Database not found: $DB_PATH" >&2
  exit 1
fi

if [ ! -d "$UPLOADS_PATH" ]; then
  echo "Uploads directory not found: $UPLOADS_PATH" >&2
  exit 1
fi

DB_BACKUP="$BACKUP_ROOT/xrsimple-db-$TIMESTAMP.db"
UPLOADS_BACKUP="$BACKUP_ROOT/xrsimple-uploads-$TIMESTAMP.tar.gz"

cp "$DB_PATH" "$DB_BACKUP"
tar -czf "$UPLOADS_BACKUP" -C "$UPLOADS_PATH" .

find "$BACKUP_ROOT" -type f -mtime +"$KEEP_DAYS" -delete

echo "Backup complete:"
echo "  DB:      $DB_BACKUP"
echo "  Uploads: $UPLOADS_BACKUP"
