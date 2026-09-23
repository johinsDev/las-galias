import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Flex, Typography } from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";

/**
 * «Reenviar al CRM» for one lead, on its edit view.
 *
 * Attempts go back to zero and the push runs right away; the toast says what
 * Sinco answered. A lead the CRM already took asks before sending again.
 */
interface ResendData {
  refused?: boolean;
  crmStatus?: string | null;
  crmVisitId?: string | null;
  crmLastError?: string | null;
}

const MESSAGES: Record<string, (r: ResendData) => string> = {
  sent: (r) =>
    `Enviado al CRM${r.crmVisitId ? ` (visita ${r.crmVisitId})` : ""}. Recarga para verlo.`,
  duplicate: (r) =>
    `El CRM ya conocía a esta persona${r.crmVisitId ? `; quedó en la visita ${r.crmVisitId}` : ""}.`,
  unrouted: () =>
    "Sin proyecto de Sinco: elige uno por defecto en «Configuración · CRM» y vuelve a intentarlo.",
  skipped: () => "El CRM está en modo manual (LEAD_PROVIDER): no se envió nada.",
  pending: () => "Quedó pendiente; el reintento automático lo tomará.",
};

export default function ResendToCrmButton() {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [loading, setLoading] = useState(false);

  // The zone renders for every content type; this action is lead-only.
  if (slug !== "api::lead.lead" || !id) return null;

  const send = async (force: boolean) => {
    const { data } = await post<{ data: ResendData }>(
      `/leads/${id}/resend-crm${force ? "?force=1" : ""}`,
    );
    return data.data;
  };

  const onClick = async () => {
    setLoading(true);
    try {
      let result = await send(false);
      if (result.refused) {
        const again = window.confirm("Este lead ya está en el CRM. ¿Reenviarlo de todos modos?");
        if (!again) return;
        result = await send(true);
      }
      const status = result.crmStatus ?? "pending";
      if (status === "failed") {
        toggleNotification({
          type: "danger",
          message: `Sinco lo rechazó: ${result.crmLastError ?? "sin detalle"}`,
        });
      } else {
        toggleNotification({
          type: status === "unrouted" ? "warning" : "success",
          message: (MESSAGES[status] ?? (() => `Estado: ${status}`))(result),
        });
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "No se pudo reenviar. Revisa el registro de tareas.";
      toggleNotification({ type: "danger", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="sigma" textColor="neutral600">
        CRM
      </Typography>
      <Button variant="secondary" onClick={onClick} loading={loading} fullWidth>
        Reenviar al CRM
      </Button>
      <Typography variant="pi" textColor="neutral600">
        Pone los intentos a cero y lo envía a Sinco ahora mismo.
      </Typography>
    </Flex>
  );
}
