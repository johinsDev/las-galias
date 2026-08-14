# Deploy del CMS en AWS Lightsail (opción A)

Strapi + Postgres + Caddy (HTTPS automático) en **una sola instancia** Lightsail.
Uploads e imágenes van a **S3**; los **backups** de la base van a S3 con `pg_dump`.
Costo ≈ **12 USD/mes** (instancia 2 GB) + centavos de S3 + **~2 USD/mes** si activas
la estrategia de backup recomendada (snapshot del disco + pg_dump horario) = **~14/mes**.

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

   _Sin dominio todavía_: usa **sslip.io**, que resuelve la IP desde el propio
   nombre. Con la IP `54.144.170.217`, pon `CMS_DOMAIN=54-144-170-217.sslip.io`
   y Caddy le saca un certificado de Let's Encrypt real, sin tocar DNS. Es lo
   que corre hoy en producción.

5. **Bucket y credenciales S3** → crea el bucket y un **IAM user restringido**
   (`PutObject`/`GetObject`/`DeleteObject` sobre `arn:...:bucket/*` y
   `ListBucket` sobre `arn:...:bucket`, sin admin) con su access key.

   El bucket necesita además una **bucket policy de lectura pública**: Strapi
   sube sin ACL (`ACL: null` en `config/plugins.ts`, porque el bucket tiene
   "Bucket owner enforced"), así que sin la policy las imágenes dan **403 en el
   sitio** aunque el upload funcione.

   Y como `.env.example` manda uploads **y** backups al mismo bucket, la policy
   necesita un `Deny` sobre `db-backups/*` — si no, los `pg_dump`, que llevan
   los leads dentro, quedan descargables por cualquiera:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadUploads",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::las-galias-uploads/*"
       },
       {
         "Sid": "BackupsNeverPublic",
         "Effect": "Deny",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::las-galias-uploads/db-backups/*",
         "Condition": { "StringNotEquals": { "aws:PrincipalAccount": "017677777401" } }
       }
     ]
   }
   ```

   Compruébalo desde fuera, sin credenciales: un upload debe dar 200 y un
   objeto de `db-backups/` debe dar 403.

6. **Configurar y desplegar** (dentro de la instancia):

   ```bash
   cd /opt/las-galias/deploy/lightsail
   cp .env.example .env
   nano .env            # secrets (openssl rand -base64 32), dominio, creds S3, deploy hook
   sudo ./scripts/deploy.sh  # descarga la imagen y levanta; Caddy saca el HTTPS solo
   ```

   Abre `https://cms.lasgalias.com/admin` y crea tu usuario admin.

7. **Cargar contenido** → desde tu máquina, con la instancia arriba:

   ```bash
   cd apps/cms
   bun run strapi transfer --to https://cms.lasgalias.com/admin --to-token <token> --force
   ```

   (genera el transfer token en el admin remoto → Settings → Transfer Tokens)

   **`strapi transfer` NO copia las tablas de admin**: usuarios, API tokens y
   transfer tokens se quedan atrás. Después de migrar hay que **emitir un
   `STRAPI_API_TOKEN` nuevo** en el panel destino y actualizarlo en Vercel, o el
   build responde 401 en todo. Copiar `API_TOKEN_SALT` no sirve: lo que falta no
   es el hash, es el registro. Desde `d1e9531` eso rompe el build en vez de
   publicar un sitio vacío, pero igual hay que emitirlo.

   Para pasar de un CMS remoto a otro hacen falta dos saltos, porque `transfer`
   solo admite un extremo remoto: `--from <viejo>` a la base local, y luego
   `--to <nuevo>`. Ese rodeo es además lo que hace que los archivos se vuelvan a
   subir por el provider del destino y acaben en S3.

## Backups — estrategia recomendada (activar las DOS)

Coste total del backup ≈ **~2 USD/mes** (deja el hosting completo en ~14/mes).
Cubren cosas distintas: el `pg_dump` salva los **datos**; el snapshot salva la
**máquina entera** y acelera la recuperación de ~30 min a ~5 min.

### 1) `pg_dump` → S3, **cada hora** (protege los datos · ~$0.06-0.25/mes)

```bash
crontab -e
# backup cada hora, en el minuto 0
0 * * * * /opt/las-galias/deploy/lightsail/scripts/backup.sh >> /var/log/lg-backup.log 2>&1
```

Ventana de pérdida máxima = 1 hora (importante por los leads). El `backup.sh` ya
nombra cada copia con timestamp único, así que horario funciona sin cambios.

**Retención automática de 30 días** (para que los horarios no se acumulen para
siempre) — una regla de lifecycle en el bucket, S3 los borra solo (gratis):

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BACKUP_BUCKET" \
  --lifecycle-configuration file://s3-lifecycle-backups.json
```

(el archivo `s3-lifecycle-backups.json` está en esta carpeta)

### 2) Snapshot automático del disco en Lightsail (protege la VM entera · ~$1-2/mes)

En la consola de Lightsail: instancia → pestaña **Snapshots** → **Enable automatic
snapshots** (elige la hora). Copia completa del disco (SO + Docker + `.env` +
volúmenes) restaurable en minutos. Cubre el `.env` con los secrets, que no está
en Git ni en la DB.

**Restaurar la DB** (en la instancia):

```bash
aws s3 cp s3://<bucket>/db-backups/<archivo>.sql.gz - | gunzip | \
  docker compose --env-file .env exec -T postgres psql -U strapi lasgalias
```

## Despliegue automático desde GitHub

`.github/workflows/ci.yml` despliega el CMS al mergear a `main`, después de que
pase el gate de calidad. Existe porque Vercel sí despliega solo y esto no:
llegaron a acumularse cuatro semanas de cambios de esquema en `main` que nunca
llegaron al CMS, con el sitio pidiendo campos que allí no existían.

La imagen **la compila el runner de GitHub, no la instancia**: el panel de admin
de Strapi necesita ~2 GB para compilarse y esta caja tiene 2 GB, así que paginaba
hasta 96% de I/O wait, sshd dejaba de responder y el despliegue moría a mitad con
el CMS parado. Ahora se publica en `ghcr.io/johinsdev/las-galias-cms` y aquí solo
se descarga: segundos en vez de 20 minutos.

Solo corre si cambió `apps/cms/`, `deploy/lightsail/`, `packages/providers|schemas`
o `bun.lock` — no tiene sentido reemplazar el contenedor por un cambio de CSS. Se puede lanzar a mano desde la
pestaña **Actions** (`workflow_dispatch`) sin hacer un commit vacío.

Hay que crear tres secretos en **Settings → Secrets and variables → Actions**:

| Secreto             | Qué es                                                                |
| ------------------- | --------------------------------------------------------------------- |
| `LIGHTSAIL_HOST`    | IP estática o dominio de la instancia                                 |
| `LIGHTSAIL_SSH_KEY` | Clave **privada** SSH con acceso a la instancia (contenido, no ruta)  |
| `LIGHTSAIL_USER`    | Opcional; por defecto `ubuntu`                                        |
| `CMS_PUBLIC_URL`    | Opcional; si está, el workflow verifica que el CMS volvió a responder |

Conviene generar un par de claves dedicado para esto en vez de reusar el
personal, y añadir la pública al `~/.ssh/authorized_keys` de la instancia:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./lg-deploy -N ""
# el contenido de ./lg-deploy va en LIGHTSAIL_SSH_KEY; ./lg-deploy.pub a la instancia
```

## Operación diaria

| Acción                           | Comando                                               |
| -------------------------------- | ----------------------------------------------------- |
| Actualizar el CMS (tras un push) | `./scripts/deploy.sh` (o dejar que lo haga la Action) |
| Ver logs                         | `docker compose logs -f cms`                          |
| Reiniciar                        | `docker compose --env-file .env restart cms`          |
| Backup manual                    | `./scripts/backup.sh`                                 |

## Qué NO se pierde aunque muera la instancia

- **Imágenes** → viven en S3 (independiente de la VM).
- **Base de datos** → último `pg_dump` en S3 + snapshot del disco.
- **Código** → el repo en GitHub.

> Nota: esta opción no tiene alta disponibilidad (una sola instancia). Como el
> sitio público es estático en Vercel, si el CMS se cae unos minutos el sitio
> sigue online; recuperas la instancia desde snapshot o recreándola + restore.
