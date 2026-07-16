#!/usr/bin/env bash
# Copia de seguridad de la base de datos → S3 (pg_dump comprimido).
# Correr por cron (ver README) o a mano.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
# shellcheck disable=SC1091
source .env
set +a

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="/tmp/lasgalias-${STAMP}.sql.gz"
KEY="db-backups/lasgalias-${STAMP}.sql.gz"

echo "▶ pg_dump…"
docker compose --env-file .env exec -T postgres \
	pg_dump -U "$DATABASE_USERNAME" "$DATABASE_NAME" | gzip >"$FILE"

echo "▶ subiendo a s3://${BACKUP_BUCKET}/${KEY}…"
docker run --rm \
	-e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_REGION="$AWS_REGION" \
	-v "$FILE:/tmp/backup.sql.gz:ro" \
	amazon/aws-cli s3 cp /tmp/backup.sql.gz "s3://${BACKUP_BUCKET}/${KEY}"

rm -f "$FILE"
echo "✅ Backup subido: ${KEY}"

# Restaurar (manual, en la instancia):
#   aws s3 cp s3://<bucket>/db-backups/<archivo>.sql.gz - | gunzip | \
#     docker compose --env-file .env exec -T postgres psql -U $DATABASE_USERNAME $DATABASE_NAME
