# Las Galias — monorepo

Sitio web de la constructora Las Galias. Turborepo + bun workspaces.

- `apps/web` — sitio público. **Astro** (SSG estático) + Tailwind CSS v4 (vía
  `@tailwindcss/vite`) + Partytown para third-party scripts. Deploy en Vercel con
  `@astrojs/vercel` (necesario aunque el sitio sea estático: emite las redirecciones
  del CMS como 301 reales y habilita Vercel Image Optimization). Casi cero JS: las
  islas React (`src/islands/`, `client:visible`) son LeadForm, MortgageCalculator y
  CurrencySwitcher. Animaciones con `motion` (API vanilla) + View Transitions.
- `apps/cms` — **Strapi v5** (Postgres siempre, nunca SQLite). Self-hosted en AWS
  (Fargate + RDS + S3) vía **SST v3** (`sst.config.ts` en la raíz). Los content
  types y las reglas de negocio viven como código (schemas JSON + document-service
  middlewares en `src/index.ts`).
- `packages/ui` — design system (`@lasgalias/ui`): shadcn sobre Base UI + tokens en
  `src/styles/globals.css`.
- `packages/providers` — `@lasgalias/providers`: contratos agnósticos
  `ProjectDataProvider` (Sinco/manual, strategy pattern) y `RateProvider` (TRM +
  cross-rate EUR). Strapi los consume compilados (tsup → dist).
- `packages/schemas` — `@lasgalias/schemas`: schemas Valibot compartidos (leads) y
  tipos del contenido.
- `packages/typescript-config` — presets tsconfig compartidos.

## Convenciones

- Package manager: **bun** (solo como package manager — Strapi buildea y corre con
  **node**, jamás `bun --bun` sobre strapi). Task runner: **turbo**
  (`bun run dev|build|check|lint`).
- Lint/format: ESLint (flat, `eslint-plugin-astro`) + Prettier (`prettier-plugin-astro`
  - `prettier-plugin-tailwindcss`); `astro check` para tipos en `.astro`.
- Git hooks: **lefthook** (pre-commit: prettier + eslint en staged; commit-msg:
  commitlint / Conventional Commits). Se instala con `bun install`.
- Design tokens SOLO en `packages/ui/src/styles/globals.css` (Tailwind v4 `@theme` +
  variables shadcn). El escaneo cross-package depende de las directivas `@source`
  de ese archivo — mantenerlas correctas o las utilities de la app se purgan.
- Deploy web: Vercel construye `apps/web` desde la raíz (`turbo run build --filter=web`).
- Deploy CMS: `AWS_PROFILE=<perfil> bunx sst deploy --stage <stage>` crea TODO
  (VPC, RDS, Fargate, S3, secrets) en la cuenta AWS del perfil. Secrets con
  `bunx sst secret set <Nombre> <valor> --stage <stage>` (una vez por cuenta/stage).
- Dev local del CMS: `docker compose up -d` (Postgres 16) y `bun run dev` en apps/cms.

## Dominio (reglas de negocio del CMS)

- `proyecto` tiene `etapa: expectativa | venta`. En expectativa se publica con menos
  campos (la validación vive en un document-service middleware al publicar).
- Los `recomendados` de un proyecto deben ser de la **misma ciudad** (middleware).
- Al despublicar un proyecto se crea una `redireccion` automática a `/proyectos`.
- Las `zona-de-interes` pertenecen a un `macroproyecto`; las `zona-comun` son
  reutilizables entre proyectos (m2m).
- Publish/unpublish de contenido público dispara (con debounce) el Deploy Hook de
  Vercel → rebuild del sitio estático.
- Solo Super Admin toca `redireccion`, `configuracion-calculadora` y `tasa-de-cambio`.
- Los precios base están en COP; USD/EUR se calculan con tasas del cron diario
  (TRM datos.gov.co + cross-rate ECB) guardadas en `tasa-de-cambio`.

## Quality gate — MANDATORY before every commit and push

Run these from the repo root and make sure ALL pass before committing.
Do not commit, push, or open a PR with any of them failing:

1. `bun run format` — Prettier writes formatting (then re-stage the files).
2. `bun run check` — typecheck (`astro check` + tsc).
3. `bun run lint` — ESLint.
4. `bun run knip` — no dead code / unused exports.

Rules:

- NEVER use `--no-verify` / `-n` to skip lefthook, and never bypass a failing
  check "to fix it later". If a check fails, fix the code first.
- This applies to every change, however small — a one-line copy tweak still
  goes through the full gate.
