# Las Galias

Website + CMS for **Constructora Las Galias** (Colombian real-estate developer).

- **`apps/web`** — public site. [Astro 7](https://astro.build) (100% static SSG), Tailwind CSS v4, Partytown for third-party scripts, shadcn/ui on Base UI, Formisch + Valibot forms, `motion` + View Transitions. Deployed on **Vercel**.
- **`apps/cms`** — [Strapi v5](https://strapi.io) (Postgres). Self-hosted on **AWS** (Fargate + RDS + S3), provisioned with **SST v3** from `sst.config.ts`.
- **`packages/ui`** — design system: shadcn components + brand tokens (`globals.css`).
- **`packages/providers`** — source-agnostic contracts: `ProjectDataProvider` (Sinco ERP / manual, strategy pattern) and `RateProvider` (official TRM + ECB cross-rate).
- **`packages/schemas`** — shared Valibot schemas and content types.
- **`packages/typescript-config`** — shared tsconfig presets.

Code is English; public URLs and site copy are Spanish (Colombian audience).

## Quickstart

Prerequisites: [bun](https://bun.sh) ≥ 1.3.14, Node 22, Docker.

```bash
bun install            # installs everything (isolated linker, see bunfig.toml)
docker compose up -d   # local Postgres 16
cp .env.example apps/cms/.env    # then generate real secrets (openssl rand -base64 32)
cp .env.example apps/web/.env    # only the web section applies

bun run dev            # web (localhost:4321) + cms (localhost:1337) via turbo
```

First run: open `http://localhost:1337/admin`, create your admin user, then load demo
content:

```bash
cd apps/cms && bun run seed
```

The seed is idempotent (marker: city `bogota`) and creates cities, a macroproject with
points of interest, amenities, 6 published projects (both stages) with placeholder
images, home banners, blog posts, calculator config and live TRM/ECB exchange rates.

> Port 1337 busy? Something else is holding it: `lsof -ti :1337 | xargs kill`.
> Stray Astro dev daemon? `bunx astro dev stop`.

## Quality gate (mandatory before every commit/push)

```bash
bun run format   # prettier (writes)
bun run check    # astro check + tsc
bun run lint     # eslint
bun run knip     # dead code / unused exports
```

Enforced three times: lefthook pre-commit, a Claude Code pre-push hook, and CI.

## Content model (CMS)

| Type                                 | Notes                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `project`                            | `stage: expectation \| sale`. Expectation publishes with fewer fields (validated on publish) |
| `city` / `macroproject`              | Projects belong to a city; macroprojects group POIs of one location                          |
| `point-of-interest`                  | Always tied to a macroproject (locations never mix)                                          |
| `amenity`                            | Reusable across projects (m2m)                                                               |
| `post`, `home-banner`                | Blog + home banners with separate desktop/mobile images                                      |
| `lead`                               | Form submissions from PDPs/contact (public create-only)                                      |
| `redirect`                           | Admin-only; auto-created on project unpublish (→ `/proyectos`)                               |
| `calculator-config`, `exchange-rate` | Singles, admin-only; rates refreshed daily by cron (TRM + ECB)                               |

Business rules live as document-service middlewares in `apps/cms/src/index.ts`:
same-city recommended projects, stage-conditional publish validation, auto redirects,
Sinco data merge, and a debounced (60s) Vercel Deploy Hook on publish/unpublish.

## Deploying

### CMS → AWS (SST)

Everything (VPC, RDS Postgres, Fargate service, S3 uploads bucket, secrets) is created
in the AWS account of the active `AWS_PROFILE`. One-time per account/stage:

```bash
for s in StrapiAppKeys StrapiAdminJwtSecret StrapiApiTokenSalt StrapiJwtSecret StrapiTransferTokenSalt StrapiEncryptionKey; do
  AWS_PROFILE=<profile> bunx sst secret set $s "$(openssl rand -base64 32)" --stage production
done

AWS_PROFILE=<profile> bunx sst deploy --stage production
```

Outputs `cmsUrl` (the load balancer URL). Docker must be running locally (the image is
built on your machine). Switching to another AWS account = same two commands with a
different profile.

**Stages** are fully independent copies of the infrastructure, namespaced by name
(`las-galias-<stage>-*`): own VPC, database, bucket and secrets. Use `--stage dev` for a
disposable test environment and `--stage production` for the real one. Per
`sst.config.ts`, removing production **retains** stateful resources, while any other
stage is fully deleted by `sst remove --stage <name>`. Every live stage costs its own
~USD 40–45/month (ALB + NAT + RDS), so tear down what you're not using.

### Web → Vercel

1. Import the repo in Vercel — the root `vercel.json` already defines the build
   (`turbo run build --filter=web`, bun install, Astro).
2. Project env vars: `STRAPI_URL` and `PUBLIC_STRAPI_URL` = the `cmsUrl` from SST.
3. Create a Deploy Hook (Settings → Git → Deploy Hooks) and wire it into the CMS:

   ```bash
   AWS_PROFILE=<profile> bunx sst secret set VercelDeployHookUrl "<hook-url>" --stage production
   AWS_PROFILE=<profile> bunx sst deploy --stage production
   ```

From then on, publishing/unpublishing content rebuilds the site (~60s debounce), and
CMS-managed redirects ship as real 301s via the Vercel Build Output API.

## Repo quirks (read before fighting the tooling)

- **bun 1.3 isolated linker** (`bunfig.toml`): Astro needs vite 8 while Strapi's admin
  pins vite 5 — the default hoisted linker cannot serve both. Consequence: declare a
  dependency wherever you import it (transitive deps don't resolve).
- `apps/web` pins `vite@8.1.3` (8.1.4 removed an API `@tailwindcss/vite` uses).
- `apps/cms` has its own plugin-less `.prettierrc` — the root one breaks
  `strapi ts:generate-types`.
- `ajv@^8` is a cms dependency on purpose (Strapi needs it resolvable).
- Design tokens only in `packages/ui/src/styles/globals.css`; its `@source` directives
  must keep pointing at `apps/web` or utility classes get purged silently.
- Known upstream noise: a single `pg` DeprecationWarning printed by Strapi internals.

## Agent skills

30 Claude Code skills are versioned in `.agents/skills` (symlinked into
`.claude/skills`, pinned by hash in `skills-lock.json`): stack guides (astro, bun,
turborepo, vite, shadcn, tailwind), engineering workflow (grill-me, to-prd, implement,
tdd, code-review, git-commit) and design (frontend-design, ui-ux-pro-max, top-design,
refactoring-ui, web-typography, microinteractions, ux-heuristics, taste-skill).
