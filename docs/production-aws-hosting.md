# Producción del CMS en AWS — planes de bajo costo (A / A+)

Estado: **borrador / decisión pendiente.** El demo corrió en el stage `dev` con
Fargate + ALB + RDS + NAT (~45 USD/mes), que es robusto pero **sobredimensionado**
para esta carga. Este documento guarda dos arquitecturas AWS más baratas para
producción, ambas 100% AWS (requisito del cliente).

## Por qué se puede simplificar

El frontend es **100% estático (SSG en Vercel)**. El público nunca toca Strapi:
las páginas se generan en el build y se sirven desde Vercel; Strapi solo trabaja
cuando un editor publica (dispara el Vercel Deploy Hook → rebuild). Por lo tanto
**el CMS no necesita alta disponibilidad**: si se cae unos minutos, el sitio
público sigue online. Eso permite eliminar el ALB, el NAT y (en la opción A) RDS.

Qué NO se pierde nunca, en ninguna opción:

- **Imágenes/uploads → S3** (durabilidad 11 nueves, separado del server).
- **Código y contenido versionado** → repo Git + el `strapi transfer` local.

Lo único que vive en la base de datos: registros de contenido y **leads**
(formularios de clientes). La estrategia de backup abajo protege eso.

---

## Opción A — Una sola instancia (VM) · ~12–14 USD/mes

Todo en una máquina con `docker-compose`: Strapi + Postgres + Caddy (reverse
proxy con HTTPS automático). Sin ALB, sin NAT, sin RDS.

```
Internet → (dominio) → Caddy :443 (HTTPS Let's Encrypt) → Strapi :1337
                                   �‑ mismo host ↓
                                   Postgres :5432 (volumen local)
   Uploads → S3 (bucket aparte, siempre)
```

**Componentes AWS**
- **AWS Lightsail** plan 2 GB = **$12/mes fijo** (instancia + 60 GB SSD + IP
  estática + 3 TB transfer incluidos). _O_ EC2 `t4g.small` (~$14 on-demand,
  ~$8–10 reservada) + EBS 30 GB + Elastic IP.
- **S3** para uploads (~centavos).
- Dominio apuntando a la IP (para el cert de Caddy). Sin dominio: poner
  CloudFront delante (cert `*.cloudfront.net`, como en el demo) y Caddy en HTTP.

**Deploy** (mismo `Dockerfile` que ya existe)
1. Provisionar la instancia (SST con `aws.ec2.Instance` + EIP + security group, o
   Lightsail vía consola/CLI).
2. `user-data` instala Docker + Compose y clona/pull del repo.
3. `docker compose up -d` levanta strapi + postgres + caddy.
4. Redeploy de contenido: `bunx strapi transfer` desde local (como en el demo).

**Backups / recuperación — estrategia recomendada (activar las dos, ~$2/mes)**
- **`pg_dump` HORARIO → S3** (cron `0 * * * *`). Protege los datos; ventana de
  pérdida = 1 h (importante por los leads). ~$0.06–0.25/mes. Retención 30 días con
  una **S3 Lifecycle rule** (`deploy/lightsail/s3-lifecycle-backups.json`).
- **Snapshot automático del disco** (Lightsail: 1 clic; EC2: Data Lifecycle
  Manager) → ~$1–2/mes. Protege la VM entera (incluye el `.env` con secrets, que
  no está en Git ni en la DB) y baja la recuperación de ~30 min a ~5 min.
- Restore de datos: descomprimir el dump de S3 en `psql` (ver kit).
- Kit completo listo en `deploy/lightsail/` (compose + Caddy + scripts + README).

**Trade-offs**
- Sin failover automático (si la VM cae, se reinicia/recrea a mano).
- Los backups son configuración nuestra (no gestionados). Con el cron a S3 +
  snapshots queda cubierto, pero hay que montarlo y vigilar que corra.
- Postgres y Strapi comparten CPU/RAM (2 GB alcanza para esta carga; vigilar).

---

## Opción A+ — EC2 + RDS (sin ALB ni NAT) · ~24 USD/mes  ⭐ recomendada si preocupa la data

Igual de simple en red que A (una EC2 con Caddy, sin balanceador), pero la base
de datos vive en **RDS gestionado** → backups automáticos y point-in-time
recovery sin que administremos nada.

```
Internet → (dominio) → Caddy :443 → Strapi :1337 (EC2, subred pública)
                                          ↓
                                   RDS Postgres (t4g.micro, backups automáticos)
   Uploads → S3
```

**Componentes AWS**
- **EC2** `t4g.small` con Strapi + Caddy en Docker (~$10/mes) + EIP.
- **RDS** Postgres `t4g.micro` (~$14/mes) — incluye **backups automáticos
  diarios + PITR** (retención 7 días gratis).
- **S3** para uploads.
- Sin ALB (~$16 ahorrados), sin NAT (~$4 ahorrados) — la EC2 está en subred
  pública con IP pública/EIP; Caddy expone HTTPS.

**Deploy**: idéntico a A, pero `docker-compose` solo trae Strapi + Caddy;
`DATABASE_HOST` apunta al endpoint de RDS.

**Backups / recuperación** (gestionado por AWS)
- RDS hace snapshots automáticos + PITR → recuperás a cualquier segundo de los
  últimos 7 días, **sin configurar nada**.
- Si el server (EC2) muere: recrear la instancia; la data sigue intacta en RDS.
- Opcional (doble cinturón): `pg_dump` semanal a S3 para retención larga/portátil.

**Trade-offs**
- ~12 USD/mes más que A, a cambio de cero mantenimiento de backups y datos
  seguros de raíz.
- El server de Strapi sigue siendo una sola instancia (sin HA), pero eso no
  afecta al sitio público (estático). Aceptable.

---

## Opción A2 — Lightsail + Lightsail Managed Database · ~27 USD/mes

Variante 100% Lightsail de A+, para máxima simplicidad y precio plano. La
instancia Lightsail corre Strapi + Caddy; la base va en una **Lightsail Managed
Database** (Postgres gestionado, backups automáticos), en vez de RDS.

- Instancia Lightsail 2 GB (~$12) + Lightsail Managed DB micro (~$15) = ~$27/mes.
- Backups automáticos gestionados (como RDS) sin administrar nada.
- Todo con precio plano y consola simple.
- **Contra:** menos integrable con el resto de AWS y **no encaja bien con SST/IaC**
  (SST no tiene componentes de alto nivel para Lightsail; se opera por consola/CLI
  o Pulumi crudo). Si el requisito "un comando despliega / cambio de cuenta" pesa,
  A+ (EC2+RDS) es mejor encaje.

## Comparación

| | Costo/mes | Backups DB | Si muere el server | Encaje SST/IaC |
|---|---|---|---|---|
| **A** — VM (Postgres local) | ~12–14 | nosotros (`pg_dump`→S3 + snapshots) | restaurar del último dump | medio (Pulumi EC2) |
| **A2** — Lightsail + Managed DB | ~27 | **automáticos (Lightsail)** | **data intacta en la DB** | pobre (consola/CLI) |
| **A+** — EC2 + RDS | ~24 | **automáticos + PITR (RDS)** | **data intacta en RDS** | **bueno** (nativo) |
| Actual (dev) — Fargate+ALB+RDS+NAT | ~45 | automáticos + PITR | data intacta, con HA | bueno |

Nota jerárquica (por si se retoma la discusión de contenedores): **ECR** guarda
la imagen, **ECS vs Kubernetes/EKS** es la capa de orquestación, **EC2 vs
Fargate** es dónde corre. Para este CMS (1 instancia, carga baja) cualquier
orquestador es overkill → VM directa.

**Recomendación:** si el driver es costo mínimo → **A**. Si quieres simplicidad
total con backups gestionados y no importa perder el `sst deploy` → **A2**
(Lightsail). Si preocupa perder contenido/leads y quieres mantener SST/IaC →
**A+** (EC2+RDS): casi la mitad del costo actual, datos
gestionados por AWS, mismo Strapi.

---

## Lo que NO cambia respecto al demo

- **Mismo código y mismo `Dockerfile`** — solo cambia *dónde* corre el contenedor.
- **Uploads siguen en S3** (mismo provider, `config/plugins.ts` con `ACL: null`).
- **Deploy Hook a Vercel** y el flujo publish→rebuild se mantienen.
- **Un comando / cambio de cuenta**: se puede conservar en `sst.config.ts`
  (recursos EC2/RDS vía Pulumi) o con un script de deploy; sigue el patrón
  `AWS_PROFILE=<perfil> sst deploy`.
- **Providers agnósticos** (Sinco/rates) intactos.

## Pendientes al ejecutar

- Definir dominio para el CMS (ej. `cms.lasgalias.com`) para el cert de Caddy;
  si no hay dominio, CloudFront delante con IP estática (EIP) como en el demo.
- Reescribir la sección de infra del `sst.config.ts` (hoy: Vpc/Cluster/Service/
  Postgres) a la arquitectura elegida (EC2 [+ RDS] + EIP + SG + Caddy vía
  user-data), conservando los 6 secrets de Strapi + `UPLOADS_BUCKET`.
- Montar el cron `pg_dump`→S3 (obligatorio en A, opcional en A+).
- Migrar los datos con `strapi transfer` (como en el demo).
