# Traspaso del proyecto a Las Galias

Estado: **plan, sin ejecutar.** Última revisión de los hechos: 12 ago 2026.

Hoy el proyecto entero depende de cuentas personales de Johan. Si esa persona
cierra una cuenta, pierde acceso o simplemente sale del proyecto, el sitio se
cae y nadie más puede desplegarlo. Este documento dice qué está a nombre de
quién, en qué orden moverlo, qué se rompe en cada paso y qué credenciales hay
que revocar al final.

## Qué está a nombre de quién, hoy

| Pieza                   | Dueño actual                                                                           | Riesgo si Johan sale                                         |
| ----------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Repositorio             | `johinsDev/las-galias` — GitHub **personal**, y **público**                            | Nadie más puede administrarlo. Además cualquiera lo lee hoy. |
| Sitio (Vercel)          | Equipo `johan-villamils-projects` — **personal**                                       | El sitio deja de desplegarse y puede caerse                  |
| CMS (Lightsail)         | Su cuenta AWS. Instancia `44.208.234.104`, Strapi + Postgres + Caddy en docker compose | Se pierde el CMS, la base y los leads                        |
| Uploads y backups (S3)  | Buckets en la misma cuenta AWS, con un IAM user restringido                            | Se pierden todas las imágenes                                |
| Dominio `lasgalias.com` | Registrado, pero **aparcado** (`parkingcrew.net`). No apunta a nada                    | Desconocido — hay que averiguar en qué registrador está      |
| Secretos del CMS        | Archivo `.env` **solo dentro de la instancia**, fuera de Git                           | Si muere la caja sin snapshot, se pierden                    |

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

### 5. Mover el CMS

Es el paso caro y hay dos caminos:

- **Transferir la cuenta AWS entera** (si la instancia está en una cuenta que
  solo se usa para esto). Nada cambia: misma IP, mismos buckets, mismo `.env`.
  Es de lejos lo más limpio si es viable.
- **Recrear la instancia** en la cuenta de ellos: `bootstrap.sh`, restaurar el
  `pg_dump` más reciente desde S3, copiar los buckets, nuevo IAM user, nuevo
  `.env`. **La IP estática cambia**, así que hay que rehacer DNS, `STRAPI_URL`
  en Vercel y los secretos del despliegue automático.

Antes de tocar nada: **un `backup.sh` manual y un snapshot del disco**. Ahí
viven los leads.

### 6. Conectar el dominio

Con el dominio ya en manos de Las Galias:

- `lasgalias.com` y `www` → el proyecto de Vercel.
- `cms.lasgalias.com` → la IP de la instancia (Caddy saca el certificado solo).
- Después: `CORS_ORIGINS` con el dominio real, `STRAPI_URL`/`PUBLIC_STRAPI_URL`
  apuntando a `cms.lasgalias.com`, y quitar la protección de despliegue de Vercel
  para que el sitio sea público.

### 7. Cerrar el despliegue automático del CMS

Con la instancia ya en su sitio definitivo, generar la clave dedicada y los
secretos (ver `deploy/lightsail/README.md`). **Hacerlo ahora y no antes**: si la
instancia se recrea en el paso 5, la IP cambia y todo esto habría que rehacerlo.

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

| Paso             | Qué deja de funcionar                                                    | Cuánto            |
| ---------------- | ------------------------------------------------------------------------ | ----------------- |
| 3 · Repo         | El despliegue automático del CMS, hasta recrear los secretos             | Minutos           |
| 4 · Vercel       | Publicar en el CMS deja de reconstruir el sitio hasta actualizar el hook | Hasta que se note |
| 5 · CMS recreado | El panel de admin, mientras se restaura                                  | ~1 hora           |
| 6 · DNS          | Propagación                                                              | Hasta 24 h        |
| 8 · Rotación     | Nada, si se hace con la caja arriba                                      | —                 |

## Antes de empezar

Esto es lo que hay que responder para poder ejecutar el plan:

1. ¿En qué registrador está `lasgalias.com` y quién tiene la cuenta?
2. ¿La cuenta AWS actual es exclusiva de este proyecto? Decide entre transferir
   la cuenta o recrear la instancia.
3. ¿El repositorio sigue público al pasarlo a la organización?
4. ¿Quién de Las Galias va a ser el dueño administrativo de las tres cuentas?
5. ¿Hay una fecha objetivo? El paso 5 conviene hacerlo fuera de horario.

## Lo que NO hay que hacer

- **No borres el contenido de demo antes de tener el real cargado.** Desde el
  commit `9c026fc` el build falla si no alcanza el CMS en vez de rellenar con
  datos inventados, así que un CMS vacío deja el sitio sin reconstruir.
- **No montes los secretos del despliegue antes del paso 5** si la instancia va
  a recrearse.
- **No transfieras la cuenta AWS sin un backup verificado.** «Existe un backup»
  y «el backup restaura» no son lo mismo; probar el restore es parte del paso.
