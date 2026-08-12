/**
 * Public routes for the FAQ assistant.
 *
 * Declared as a plain route file under src/api (content-api) so the public role
 * can be granted access from bootstrap, exactly like the lead endpoint. The
 * admin router (strapi.server.routes({type:"admin"})) is the other option and
 * is wrong here — it only accepts the admin panel's JWT, which a visitor on the
 * public site does not have.
 */
export default {
  routes: [
    {
      method: "POST",
      path: "/faq-bot/ask",
      handler: "api::faq-bot.faq-bot.ask",
      config: { policies: [] },
    },
    {
      // Only the two fields the site needs to render the widget. The config
      // single type stays private: `organizationContext` and `promptExtra` are
      // prompt internals and have no business being readable by the public.
      method: "GET",
      path: "/faq-bot/config",
      handler: "api::faq-bot.faq-bot.publicConfig",
      config: { policies: [] },
    },
  ],
};
