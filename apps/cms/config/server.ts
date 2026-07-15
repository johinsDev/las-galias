import type { Core } from "@strapi/strapi";

import cronTasks from "./cron-tasks";

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  app: {
    keys: env.array("APP_KEYS")!,
  },
  url: env("PUBLIC_URL", ""),
  // Behind CloudFront/ALB: trust X-Forwarded-* so Strapi resolves the HTTPS
  // public host correctly instead of the internal HTTP one.
  proxy: env.bool("IS_PROXIED", false),
  cron: {
    enabled: env.bool("CRON_ENABLED", true),
    tasks: cronTasks,
  },
  webhooks: {
    populateRelations: env.bool("WEBHOOKS_POPULATE_RELATIONS", false),
  },
});

export default config;
