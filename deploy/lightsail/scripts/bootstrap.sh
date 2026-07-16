#!/usr/bin/env bash
# Prepara una instancia Ubuntu (Lightsail o EC2) recién creada:
# swap (para que el build de Strapi no muera por RAM en 2 GB), Docker, y el repo.
# Puedes pegarlo como "launch script" al crear la instancia Lightsail, o correrlo
# a mano una vez:  curl -fsSL <raw-url>/bootstrap.sh | sudo bash
set -euo pipefail

REPO_URL="https://github.com/johinsDev/las-galias.git"
APP_DIR="/opt/las-galias"

echo "▶ 1/4 swap de 2 GB (evita OOM al buildear el admin de Strapi)…"
if [ ! -f /swapfile ]; then
	fallocate -l 2G /swapfile
	chmod 600 /swapfile
	mkswap /swapfile
	swapon /swapfile
	echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

echo "▶ 2/4 Docker + Compose…"
if ! command -v docker >/dev/null 2>&1; then
	curl -fsSL https://get.docker.com | sh
fi

echo "▶ 3/4 clonar el repo en ${APP_DIR}…"
if [ -d "$APP_DIR/.git" ]; then
	git -C "$APP_DIR" pull --ff-only
else
	git clone "$REPO_URL" "$APP_DIR"
fi

echo "▶ 4/4 listo."
cat <<EOF

Siguiente paso:
  1) cd ${APP_DIR}/deploy/lightsail
  2) cp .env.example .env  && edita .env (secrets, dominio, credenciales S3)
  3) ./scripts/deploy.sh
  4) configura el backup:  ./scripts/backup.sh  y un cron diario (ver README)
EOF
