/**
 * "Sincronizar desde Sinco" for one project.
 *
 * `type: "admin"` on purpose. The caller is the button in the Content Manager,
 * which authenticates with the admin JWT — and the content API (`/api/...`)
 * does not accept that, it wants an API token. Registering this on the content
 * API answered "Missing or invalid credentials" to every click.
 *
 * Admin routes are mounted WITHOUT the `/api` prefix, so this lives at
 * `POST /projects/:documentId/sync-sinco`.
 */
export default {
  type: "admin",
  routes: [
    {
      method: "POST",
      path: "/projects/:documentId/sync-sinco",
      handler: "project.syncSinco",
      config: {
        policies: [],
      },
    },
  ],
};
