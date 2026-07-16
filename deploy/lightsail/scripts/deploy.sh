#!/usr/bin/env bash
# Despliega / actualiza el CMS: trae los últimos cambios y levanta el stack.
# Correr dentro de la instancia:  cd /opt/las-galias/deploy/lightsail && ./scripts/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE_DIR="$(pwd)"
REPO_DIR="$(cd ../.. && pwd)"

if [ ! -f "$COMPOSE_DIR/.env" ]; then
	echo "✗ Falta $COMPOSE_DIR/.env — copia .env.example y rellénalo primero."
	exit 1
fi

echo "▶ git pull…"
git -C "$REPO_DIR" pull --ff-only

echo "▶ build + up…"
docker compose --env-file .env up -d --build

echo "▶ limpiando imágenes viejas…"
docker image prune -f >/dev/null 2>&1 || true

echo "✅ Listo. Logs:  docker compose logs -f cms"
