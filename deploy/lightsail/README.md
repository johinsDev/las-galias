# Deploy del CMS en AWS Lightsail (opción A)

Strapi + Postgres + Caddy (HTTPS automático) en **una sola instancia** Lightsail.
Uploads e imágenes van a **S3**; los **backups** de la base van a S3 con `pg_dump`.
Costo ≈ **12 USD/mes** (instancia 2 GB) + centavos de S3.

```
Internet → cms.lasgalias.com → Caddy :443 (HTTPS) → Strapi :1337
                                                     Postgres (volumen local)
Uploads → S3          Backups (pg_dump) → S3
```

## Pasos (una vez)

1. **Crear la instancia** en Lightsail
   - Ubuntu 22.04, plan **2 GB RAM / 2 vCPU** (≈ $12/mes). _Con 4 GB (~$24) el
     build va más holgado; con 2 GB el `bootstrap.sh` añade swap para compensar._
   - En "Launch script" pega el contenido de `scripts/bootstrap.sh` (o córrelo a
     mano luego: `curl -fsSL <raw>/bootstrap.sh | sudo bash`).

2. **IP estática** → en Lightsail: Networking → Create static IP → adjúntala a la
   instancia (gratis mientras esté en uso).

3. **Firewall** de la instancia → abre puertos **80** y **443** (HTTP/HTTPS).

4. **DNS** → crea un registro **A** `cms.lasgalias.com` → la IP estática.

5. **Credenciales S3** → crea un **IAM user restringido** (solo `s3:*` sobre el
   bucket de uploads/backups, no admin) y su access key. Crea el bucket si no existe.

6. **Configurar y desplegar** (dentro de la instancia):
   ```bash
   cd /opt/las-galias/deploy/lightsail
   cp .env.example .env
   nano .env            # secrets (openssl rand -base64 32), dominio, creds S3, deploy hook
   ./scripts/deploy.sh  # build + up; Caddy saca el certificado HTTPS solo
   ```
   Abre `https://cms.lasgalias.com/admin` y crea tu usuario admin.

7. **Cargar contenido** → desde tu máquina, con la instancia arriba:
   ```bash
   cd apps/cms
   bun run strapi transfer --to https://cms.lasgalias.com/admin --to-token <token> --force
   ```
   (genera el transfer token en el admin remoto → Settings → Transfer Tokens)

## Backups automáticos

`pg_dump` diario a S3 (retención según lo que definas con lifecycle en el bucket):

```bash
crontab -e
# backup diario a las 3am
0 3 * * * /opt/las-galias/deploy/lightsail/scripts/backup.sh >> /var/log/lg-backup.log 2>&1
```

**Doble cinturón (recomendado):** activa también los **snapshots automáticos** de
la instancia en Lightsail (Storage → Snapshots → Automatic) — copia completa del
disco restaurable en minutos, ~1-2 USD/mes.

**Restaurar** (en la instancia):
```bash
aws s3 cp s3://<bucket>/db-backups/<archivo>.sql.gz - | gunzip | \
  docker compose --env-file .env exec -T postgres psql -U strapi lasgalias
```

## Operación diaria

| Acción | Comando |
|---|---|
| Actualizar el CMS (tras un push) | `./scripts/deploy.sh` |
| Ver logs | `docker compose logs -f cms` |
| Reiniciar | `docker compose --env-file .env restart cms` |
| Backup manual | `./scripts/backup.sh` |

## Qué NO se pierde aunque muera la instancia

- **Imágenes** → viven en S3 (independiente de la VM).
- **Base de datos** → último `pg_dump` en S3 + snapshot del disco.
- **Código** → el repo en GitHub.

> Nota: esta opción no tiene alta disponibilidad (una sola instancia). Como el
> sitio público es estático en Vercel, si el CMS se cae unos minutos el sitio
> sigue online; recuperas la instancia desde snapshot o recreándola + restore.
