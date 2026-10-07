/**
 * Where a partner (a portal such as Zonario) delivers its leads.
 *
 * `auth: false` on purpose, and it is not "open": the handler checks the
 * integration's own key, origin, IP list and limits («Integración de leads»).
 * With Strapi's auth on, the partner's `Authorization: Bearer` would be read
 * as a Strapi API token and answered 401 before the handler ever ran.
 */
export default {
  routes: [
    {
      method: "POST",
      path: "/leads/external/:slug",
      handler: "api::lead.lead.createExternal",
      config: { auth: false, policies: [] },
    },
    {
      // The slugs a partner can send in `project`. Same key, same checks.
      method: "GET",
      path: "/leads/external/:slug/projects",
      handler: "api::lead.lead.listExternalProjects",
      config: { auth: false, policies: [] },
    },
  ],
};
