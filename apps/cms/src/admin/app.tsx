import DemoContentBanner from "./components/DemoContentBanner";
import SyncFromSincoButton from "./components/SyncFromSincoButton";

/**
 * Admin UI in Spanish, plus the "Sincronizar desde Sinco" action.
 *
 * The button is injected into the Content Manager's edit view instead of
 * shipping a whole plugin: it is one action on one content type, and an
 * injection zone keeps it to a single component.
 *
 * Field labels live in src/utils/admin-labels.ts, applied on boot.
 */

interface AdminApp {
  customFields: {
    register: (field: {
      name: string;
      type: string;
      intlLabel: { id: string; defaultMessage: string };
      intlDescription: { id: string; defaultMessage: string };
      components: { Input: () => Promise<{ default?: unknown }> };
    }) => void;
  };
  getPlugin: (id: string) => {
    injectComponent: (
      view: string,
      zone: string,
      component: { name: string; Component: unknown },
    ) => void;
  };
}

export default {
  config: {
    locales: ["es"],
  },
  register(app: AdminApp) {
    /**
     * The section headings of the edit form. It stores nothing — the field
     * exists so that Strapi, which has no concept of a section, gives us one
     * full-width slot in the middle of the form to render one. Its counterpart
     * is registered on the server in src/index.ts; both halves are needed or
     * the admin renders "missing custom field".
     */
    app.customFields.register({
      name: "section",
      type: "string",
      intlLabel: { id: "lasgalias.section.label", defaultMessage: "Sección" },
      intlDescription: {
        id: "lasgalias.section.description",
        defaultMessage: "Separador plegable del formulario. No guarda ningún valor.",
      },
      components: {
        Input: async () => import("./components/SectionHeader"),
      },
    });
  },
  bootstrap(app: AdminApp) {
    app.getPlugin("content-manager").injectComponent("editView", "right-links", {
      name: "sync-from-sinco",
      Component: SyncFromSincoButton,
    });

    // En la lista, donde un editor ve los proyectos y no puede ignorar que los
    // que están ahí son inventados.
    app.getPlugin("content-manager").injectComponent("listView", "actions", {
      name: "demo-content-banner",
      Component: DemoContentBanner,
    });
  },
};
