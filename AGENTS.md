# Las Galias — monorepo

Website for the Las Galias construction company. Turborepo + bun workspaces.

- `apps/web` — public site. **Astro** (static SSG) + Tailwind CSS v4 (via
  `@tailwindcss/vite`) + Partytown for third-party scripts. Deployed to Vercel with
  `@astrojs/vercel` (needed even though the site is static: it emits the CMS
  redirects as real 301s and enables Vercel Image Optimization). Near-zero JS: the
  React islands (`src/islands/`, `client:visible`) are LeadForm, MortgageCalculator
  and CurrencySwitcher. Animations with `motion` (vanilla API) + View Transitions.
  Public URLs and site copy are Spanish (Colombian audience); code is English.
- `apps/cms` — **Strapi v5** (always Postgres, never SQLite). Self-hosted on AWS
  (Fargate + RDS + S3) via **SST v3** (`sst.config.ts` at the repo root). Content
  types and business rules live as code (schema JSONs + document-service
  middlewares registered in `src/index.ts`).
- `packages/ui` — design system (`@lasgalias/ui`): shadcn on Base UI + tokens in
  `src/styles/globals.css`.
- `packages/providers` — `@lasgalias/providers`: source-agnostic contracts
  `ProjectDataProvider` (Sinco/manual, strategy pattern) and `RateProvider` (TRM +
  EUR cross-rate). Strapi consumes the compiled output (tsup → dist).
- `packages/schemas` — `@lasgalias/schemas`: shared Valibot schemas (leads) and
  content types.
- `packages/typescript-config` — shared tsconfig presets.

## Conventions

- Package manager: **bun** (package manager ONLY — Strapi builds and runs on
  **node**, never `bun --bun` over strapi). Task runner: **turbo**
  (`bun run dev|build|check|lint`).
- Lint/format: ESLint (flat, `eslint-plugin-astro`) + Prettier (`prettier-plugin-astro`
  - `prettier-plugin-tailwindcss`); `astro check` for `.astro` types. NOTE:
    `apps/cms` has its own plugin-less `.prettierrc` — the root one (with plugins)
    breaks `strapi ts:generate-types`.
- Pinned quirks: `overrides.vite = 8.1.3` in the root package.json
  (`@tailwindcss/vite` breaks on vite 8.1.4) and `ajv@^8` as a cms dependency
  (bun hoists eslint's ajv@6 otherwise, which breaks Strapi).
- Git hooks: **lefthook** (pre-commit: prettier + eslint on staged files;
  commit-msg: commitlint / Conventional Commits). Installed on `bun install`.
- Design tokens live only in `packages/ui/src/styles/globals.css` (Tailwind v4
  `@theme` + shadcn CSS variables). Cross-package scanning relies on the `@source`
  directives there — keep them correct or app utilities get purged.
- Web deploy: Vercel builds `apps/web` from the repo root (`turbo run build --filter=web`).
- CMS deploy: `AWS_PROFILE=<profile> bunx sst deploy --stage <stage>` creates
  EVERYTHING (VPC, RDS, Fargate, S3, secrets) in that profile's AWS account.
  Secrets via `bunx sst secret set <Name> <value> --stage <stage>` (once per
  account/stage).
- Local CMS dev: `docker compose up -d` (Postgres 16) then `bun run dev`.
  Dev data: `bun run seed` inside `apps/cms` (idempotent, creates demo content
  with placeholder images).

## Domain (CMS business rules)

- `project` has `stage: expectation | sale`. Expectation publishes with fewer
  fields (the validation lives in a document-service middleware on publish).
- A project's `recommended` list must belong to the **same city** (middleware).
- Unpublishing a project creates an automatic `redirect` to `/proyectos`.
- `point-of-interest` entries belong to a `macroproject`; `amenity` entries are
  reusable across projects (m2m).
- Publishing/unpublishing public content triggers (debounced) the Vercel Deploy
  Hook → static site rebuild.
- Only the Super Admin touches `redirect`, `calculator-config` and `exchange-rate`.
- Base prices are COP; USD/EUR come from the daily cron rates (TRM datos.gov.co +
  ECB cross-rate) stored in `exchange-rate`.

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
