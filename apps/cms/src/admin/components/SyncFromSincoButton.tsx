import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Flex, Typography } from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";

/**
 * "Sincronizar desde Sinco" for one project.
 *
 * Injected into the Content Manager edit view, so it only renders on the
 * project screen — the injection zone is shared by every content type, hence
 * the guard on the slug.
 *
 * Calls the same endpoint the nightly cron uses. Pulling from the ERP is not
 * part of saving on purpose (it would cost an auth plus 2-3 HTTP calls on every
 * "Save"), so this is how an editor asks for it on demand.
 */
export default function SyncFromSincoButton() {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [loading, setLoading] = useState(false);

  // The zone renders for every content type; this action is project-only.
  if (slug !== "api::project.project" || !id) return null;

  const onClick = async () => {
    setLoading(true);
    try {
      const { data } = await post(`/api/projects/${id}/sync-sinco`);
      toggleNotification({
        type: "success",
        message: data?.data?.updated
          ? "Precio y áreas actualizados desde Sinco. Recarga para verlos."
          : "Sinco no devolvió cambios para este proyecto.",
      });
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "No se pudo sincronizar. Revisa el registro de tareas.";
      toggleNotification({ type: "danger", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="sigma" textColor="neutral600">
        Sinco
      </Typography>
      <Button variant="secondary" onClick={onClick} loading={loading} fullWidth>
        Sincronizar desde Sinco
      </Button>
      <Typography variant="pi" textColor="neutral600">
        Trae precio y áreas. Requiere «Sincronizar desde Sinco» activado y un ID de Sinco.
      </Typography>
    </Flex>
  );
}
