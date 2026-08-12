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

# El CMS se para ANTES de compilar, no después. La caja tiene 2 GB y Strapi en
# marcha ocupa ~1.1 GB; compilando el admin al mismo tiempo no queda memoria y
# BuildKit se muere con "frontend grpc server closed unexpectedly". Son ~12 min
# de caída del panel, pero el sitio público es estático y no se entera.
echo "▶ parando el CMS para liberar memoria…"
docker compose --env-file .env stop cms

# Si el build falla, `set -e` cortaba aquí y el CMS se quedaba APAGADO hasta que
# alguien se diera cuenta. Con el deploy automatizado eso pasaría sin que nadie
# mire la consola, así que la imagen anterior vuelve a levantarse antes de salir
# con error: se pierde el cambio, no el panel.
restore_on_failure() {
	local code=$?
	if [ "$code" -ne 0 ]; then
		echo "✗ El despliegue falló (código $code). Levantando la imagen anterior…"
		docker compose --env-file .env up -d || true
	fi
	exit "$code"
}
trap restore_on_failure EXIT

echo "▶ build… (~12 min: compila el panel de admin)"
docker compose --env-file .env build cms

echo "▶ up…"
docker compose --env-file .env up -d

trap - EXIT

echo "▶ limpiando imágenes viejas…"
docker image prune -f >/dev/null 2>&1 || true

echo "✅ Listo. Logs:  docker compose logs -f cms"
