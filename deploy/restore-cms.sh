#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: ./restore-cms.sh <db-backup-file> <uploads-backup-file>" >&2
  exit 1
fi

APP_ROOT="${APP_ROOT:-/srv/xrsimple/server}"
DB_PATH="${DB_PATH:-$APP_ROOT/data/cms.db}"
UPLOADS_PATH="${UPLOADS_PATH:-$APP_ROOT/uploads}"
DB_BACKUP_FILE="$1"
UPLOADS_BACKUP_FILE="$2"

if [ ! -f "$DB_BACKUP_FILE" ]; then
  echo "DB backup file not found: $DB_BACKUP_FILE" >&2
  exit 1
fi

if [ ! -f "$UPLOADS_BACKUP_FILE" ]; then
  echo "Uploads backup file not found: $UPLOADS_BACKUP_FILE" >&2
  exit 1
fi

mkdir -p "$(dirname "$DB_PATH")"
mkdir -p "$UPLOADS_PATH"

cp "$DB_BACKUP_FILE" "$DB_PATH"
rm -rf "$UPLOADS_PATH"
mkdir -p "$UPLOADS_PATH"
tar -xzf "$UPLOADS_BACKUP_FILE" -C "$UPLOADS_PATH"

echo "Restore complete:"
echo "  DB restored to: $DB_PATH"
echo "  Uploads restored to: $UPLOADS_PATH"
