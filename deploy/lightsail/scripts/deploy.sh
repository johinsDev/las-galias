#!/usr/bin/env bash
# Despliega / actualiza el CMS: trae los últimos cambios, descarga la imagen ya
# compilada y levanta el stack.
# Correr dentro de la instancia:  cd /opt/las-galias/deploy/lightsail && sudo ./scripts/deploy.sh
#
# La imagen NO se compila aquí. El panel de admin de Strapi necesita ~2 GB para
# compilarse y esta caja tiene 2 GB: tiraba de swap, el I/O wait llegaba al 96%,
# sshd dejaba de responder y GitHub cortaba el despliegue a mitad — dejando el
# contenedor parado y a nadie que lo volviera a levantar. Ahora la compila un
# runner de GitHub (16 GB) y aquí solo se descarga, que son segundos.
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE_DIR="$(pwd)"
REPO_DIR="$(cd ../.. && pwd)"

if [ ! -f "$COMPOSE_DIR/.env" ]; then
	echo "✗ Falta $COMPOSE_DIR/.env — copia .env.example y rellénalo primero."
	exit 1
fi

# Qué versión de la imagen levantar. La Action pasa el SHA del commit para que
# lo desplegado sea exactamente lo que pasó el gate; a mano, `latest`.
export CMS_IMAGE_TAG="${CMS_IMAGE_TAG:-latest}"

echo "▶ git pull…"
git -C "$REPO_DIR" pull --ff-only

echo "▶ descargando la imagen ($CMS_IMAGE_TAG)…"
docker compose --env-file .env pull cms

# El CMS se reemplaza en caliente: `up -d` arranca el contenedor nuevo y retira
# el viejo. Ya no hace falta pararlo antes, porque no se compila nada aquí.
echo "▶ up…"
docker compose --env-file .env up -d

echo "▶ limpiando imágenes viejas…"
docker image prune -f >/dev/null 2>&1 || true

echo "✅ Listo. Logs:  docker compose logs -f cms"
