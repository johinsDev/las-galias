# Traspaso del proyecto a Las Galias

Estado: **el paso 5 está hecho** — el CMS, sus uploads y sus backups ya viven en
la cuenta AWS de Las Galias desde el 14 ago 2026. El repositorio, Vercel y el
dominio siguen pendientes. Última revisión de los hechos: 14 ago 2026.

El proyecto todavía depende de cuentas personales de Johan para el sitio y el
código. Si esa persona cierra una cuenta, pierde acceso o simplemente sale del
proyecto, el sitio deja de desplegarse. Este documento dice qué está a nombre de
quién, en qué orden moverlo, qué se rompe en cada paso y qué credenciales hay
que revocar al final.

## Qué está a nombre de quién, hoy

| Pieza                   | Dueño actual                                                                     | Riesgo si Johan sale                                         |
| ----------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Repositorio             | `johinsDev/las-galias` — GitHub **personal**, y **público**                      | Nadie más puede administrarlo. Además cualquiera lo lee hoy. |
| Sitio (Vercel)          | Equipo `johan-villamils-projects` — **personal**                                 | El sitio deja de desplegarse y puede caerse                  |
| CMS (Lightsail)         | ✅ **Las Galias** — su cuenta AWS, instancia `las-galias-cms` (`54.144.170.217`) | Ninguno: ya no depende de él                                 |
| Uploads y backups (S3)  | ✅ **Las Galias** — bucket `las-galias-uploads`, IAM user `las-galias-cms-s3`    | Ninguno                                                      |
| Dominio `lasgalias.com` | Registrado, pero **aparcado** (`parkingcrew.net`). No apunta a nada              | Desconocido — hay que averiguar en qué registrador está      |
| Secretos del CMS        | Archivo `.env` **solo dentro de la instancia**, fuera de Git                     | Cubierto: hay snapshot diario del disco                      |

Dos cosas que conviene decidir a conciencia y no por inercia:

- **El repositorio es público.** No hay credenciales dentro (los secretos viven
  en `.env` y en Vercel), pero sí la arquitectura, las reglas de negocio, la
  integración con Sinco y los scripts de despliegue del cliente.
- **El dominio nunca se conectó.** El sitio vive en una URL `*.vercel.app` con
  protección de Vercel, y el CMS en `sslip.io` sobre una IP. Nadie ajeno al
  proyecto puede ver nada hoy.

## Orden propuesto

El orden no es arbitrario: cada paso deja el siguiente más fácil, y hacerlo al
revés obliga a rehacer credenciales dos veces.

### 1. Averiguar el registrador del dominio · bloquea al resto

`lasgalias.com` está aparcado, así que no se sabe desde fuera quién lo controla.
Hay que confirmar con Las Galias en qué cuenta está registrado y conseguir
acceso. **Va primero porque decide dónde apuntan el sitio y el CMS**, y porque
si el dominio resulta estar a nombre de un tercero (una agencia anterior), eso
es una negociación, no una tarea técnica.

### 2. Crear las cuentas destino en Las Galias

Tres cuentas, ninguna personal:

- **Organización de GitHub** (p. ej. `lasgalias`), con Johan como admin invitado.
- **Equipo de Vercel** de Las Galias, facturado a ellos.
- **Cuenta AWS** de Las Galias (o confirmar que la actual ya es de ellos).

Que las cree alguien de Las Galias con su correo corporativo. Si las crea Johan
"para ellos", el problema es el mismo con otro nombre.

### 3. Mover el repositorio

Transferir `johinsDev/las-galias` a la organización. GitHub mantiene issues,
historial y redirige la URL vieja, así que los `git remote` locales siguen
funcionando.

**Se rompe:** los secretos de Actions **no se transfieren** — hay que volver a
crearlos en el destino. Aprovechar para decidir si el repo sigue público.

### 4. Mover el proyecto de Vercel

Vercel permite transferir un proyecto entre equipos. Hay que rehacer las
variables de entorno (`STRAPI_URL`, `PUBLIC_STRAPI_URL`, `STRAPI_API_TOKEN`,
`USE_CMS_SNAPSHOT`) y volver a conectar el repo de la organización nueva.

**Se rompe:** el **Deploy Hook cambia de URL**, y ese hook está guardado en el
`.env` de la instancia (`VERCEL_DEPLOY_HOOK_URL`). Hay que actualizarlo allí, o
publicar en el CMS deja de reconstruir el sitio — en silencio, que es lo peor.

### 5. Mover el CMS — ✅ HECHO (14 ago 2026)

Se tomó el camino de **recrear la instancia** en la cuenta de Las Galias
(us-east-1). Lo que quedó montado:

| Pieza       | Valor                                                              |
| ----------- | ------------------------------------------------------------------ |
| Instancia   | `las-galias-cms`, Ubuntu 22.04, bundle `small_3_0` (~12 USD/mes)   |
| IP estática | `las-galias-cms-ip` → `54.144.170.217`                             |
| URL del CMS | `https://54-144-170-217.sslip.io`                                  |
| Llave SSH   | key pair `lg-cms-deploy` (privada en `~/.ssh/lg-cms-deploy`)       |
| Bucket      | `las-galias-uploads` — uploads públicos, `db-backups/` privado     |
| Backups     | `pg_dump` horario por cron + snapshot diario del disco (07:00 UTC) |
| Retención   | lifecycle de 30 días sobre `db-backups/`                           |

El contenido se movió con `strapi transfer` en dos saltos (viejo → Postgres
local → nuevo), **no** restaurando el `pg_dump`. La razón: en la instancia vieja
`UPLOADS_BUCKET` estaba vacío y los archivos vivían en disco. Pasando por
`transfer`, el CMS nuevo los vuelve a subir por su provider y quedan en S3 con
las URLs reescritas; con un restore de base habrían quedado apuntando a
`/uploads/` en una máquina que ya no existe.

La instancia vieja (`44.208.234.104`) y su IP se eliminaron el mismo día.

**Tres cosas que costaron sangre y conviene no volver a aprender:**

1. **`strapi transfer` no copia las tablas de admin.** Usuarios, API tokens y
   transfer tokens se quedan atrás. Copiar `API_TOKEN_SALT` no basta: el
   registro del token nunca llega, así que el `STRAPI_API_TOKEN` de Vercel
   responde 401 contra el CMS nuevo. **Hay que emitir un token nuevo en el panel
   destino y actualizarlo en Vercel.** Pasó en producción: el sitio se publicó
   sin proyectos y sin blog, con el build en verde. De ahí salió el fix del
   commit `d1e9531`, que ahora hace fallar el build ante un 401.
2. **El bucket necesita una bucket policy de lectura pública.** Strapi sube sin
   ACL (`ACL: null` en `config/plugins.ts`), así que sin la policy las imágenes
   dan 403 en el sitio aunque el upload funcione.
3. **Uploads y backups comparten bucket** (`.env.example` pone el mismo en
   `UPLOADS_BUCKET` y `BACKUP_BUCKET`). Una policy pública a secas dejaría los
   `pg_dump` —con los leads dentro— descargables por cualquiera. La policy lleva
   un `Deny` sobre `db-backups/*` para todo principal fuera de la cuenta.

### 5-bis. Si algún día hay que repetirlo

Antes de tocar nada: **un `backup.sh` manual y un snapshot del disco**. Ahí
viven los leads. Y si la cuenta AWS solo se usa para esto, **transferir la
cuenta entera** sigue siendo más limpio que recrear: misma IP, mismos buckets,
mismo `.env`, y nada de lo de arriba aplica.

### 6. Conectar el dominio

Con el dominio ya en manos de Las Galias:

- `lasgalias.com` y `www` → el proyecto de Vercel.
- `cms.lasgalias.com` → la IP de la instancia (Caddy saca el certificado solo).
- Después: `CORS_ORIGINS` con el dominio real, `STRAPI_URL`/`PUBLIC_STRAPI_URL`
  apuntando a `cms.lasgalias.com`, y quitar la protección de despliegue de Vercel
  para que el sitio sea público.

### 7. Cerrar el despliegue automático del CMS — ✅ HECHO (14 ago 2026)

Los secretos de Actions ya apuntan a la instancia nueva: `LIGHTSAIL_HOST`
(`54.144.170.217`), `LIGHTSAIL_SSH_KEY` (la privada de `lg-cms-deploy`) y
`CMS_PUBLIC_URL` (`https://54-144-170-217.sslip.io`).

Ojo con el orden: **estos secretos viven en el repo, así que el paso 3 los
borra.** Si el repositorio se mueve a la organización, hay que volver a crearlos
allí — no se transfieren.

### 8. Revocar los accesos personales

El paso que de verdad cierra el traspaso, y el que más fácil se olvida:

- Quitar la clave SSH personal de Johan del `authorized_keys` de la instancia.
- Rotar los secretos que él haya visto: `APP_KEYS`, `ADMIN_JWT_SECRET`,
  `JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `ENCRYPTION_KEY`,
  contraseña de Postgres, y las credenciales de Sinco.
- Borrar el IAM user de S3 y crear uno nuevo.
- Quitar su usuario admin del panel de Strapi, o bajarlo de rol.
- Sacar el `STRAPI_API_TOKEN` viejo y emitir uno nuevo.

Rotar no es desconfianza: es que un secreto que ha estado en la máquina de
alguien que ya no está en el proyecto deja de ser un secreto.

## Qué se cae y cuándo

| Paso         | Qué deja de funcionar                                                    | Cuánto            |
| ------------ | ------------------------------------------------------------------------ | ----------------- |
| 3 · Repo     | El despliegue automático del CMS, hasta recrear los secretos             | Minutos           |
| 4 · Vercel   | Publicar en el CMS deja de reconstruir el sitio hasta actualizar el hook | Hasta que se note |
| ~~5 · CMS~~  | Hecho. En la práctica: el sitio salió una vez sin proyectos, por el 401  | ~20 min           |
| 6 · DNS      | Propagación                                                              | Hasta 24 h        |
| 8 · Rotación | Nada, si se hace con la caja arriba                                      | —                 |

## Antes de empezar

Esto es lo que hay que responder para poder ejecutar el plan:

1. ¿En qué registrador está `lasgalias.com` y quién tiene la cuenta?
2. ~~¿La cuenta AWS actual es exclusiva de este proyecto?~~ Resuelto: se recreó
   la instancia en la cuenta de Las Galias.
3. ¿El repositorio sigue público al pasarlo a la organización?
4. ¿Quién de Las Galias va a ser el dueño administrativo de las tres cuentas?
5. ¿Hay una fecha objetivo?

## Lo que NO hay que hacer

- **No borres el contenido de demo antes de tener el real cargado.** Desde el
  commit `9c026fc` el build falla si no alcanza el CMS en vez de rellenar con
  datos inventados, así que un CMS vacío deja el sitio sin reconstruir.
- **No montes los secretos del despliegue antes del paso 5** si la instancia va
  a recrearse.
- **No transfieras la cuenta AWS sin un backup verificado.** «Existe un backup»
  y «el backup restaura» no son lo mismo; probar el restore es parte del paso.
