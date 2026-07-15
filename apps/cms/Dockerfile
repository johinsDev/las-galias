# syntax=docker/dockerfile:1
# Build context: the REPO ROOT (workspace:* deps require installing everything
# together). bun is the package manager ONLY; Strapi builds and runs on node
# (glibc because of sharp — never alpine/musl).

FROM node:22-bookworm-slim AS base
RUN npm install -g bun@1.3.14

# ── deps ─────────────────────────────────────────────────────────────────────
FROM base AS install
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY apps/cms/package.json apps/cms/
COPY apps/web/package.json apps/web/
COPY packages/providers/package.json packages/providers/
COPY packages/schemas/package.json packages/schemas/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/ui/package.json packages/ui/
RUN bun install --frozen-lockfile

# ── build ────────────────────────────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/apps ./apps
COPY --from=install /app/packages ./packages
COPY package.json bun.lock bunfig.toml turbo.json ./
COPY packages ./packages
COPY apps/cms ./apps/cms
RUN cd packages/providers && bun run build
RUN cd apps/cms && NODE_ENV=production npm run build

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps ./apps
WORKDIR /app/apps/cms
EXPOSE 1337
CMD ["npm", "run", "start"]
