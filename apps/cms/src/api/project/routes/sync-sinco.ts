/**
 * Custom route, kept out of the core router so the generated public CRUD routes
 * are untouched. Not granted to the public role in bootstrap — it needs an
 * authenticated admin/API token.
 */
export default {
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
