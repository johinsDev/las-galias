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
export default {
  config: {
    locales: ["es"],
  },
  bootstrap(app: {
    getPlugin: (id: string) => {
      injectComponent: (
        view: string,
        zone: string,
        component: { name: string; Component: unknown },
      ) => void;
    };
  }) {
    app.getPlugin("content-manager").injectComponent("editView", "right-links", {
      name: "sync-from-sinco",
      Component: SyncFromSincoButton,
    });
  },
};
