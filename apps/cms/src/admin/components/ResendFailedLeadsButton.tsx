import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Flex } from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";

/**
 * «Reenviar fallidos» and «Reenviar sin proyecto» on the leads list.
 *
 * Fifty at a time, like the cron; the toast says how many are left so the
 * editor knows whether to click again. The list reloads because the statuses
 * on screen are stale the moment the request returns.
 */
interface BulkData {
  attempted: number;
  counts: Record<string, number>;
  remaining: number;
}

const LABELS: Record<string, string> = {
  sent: "enviados",
  duplicate: "duplicados",
  failed: "siguen fallando",
  unrouted: "siguen sin proyecto",
  skipped: "omitidos (modo manual)",
  pending: "pendientes",
};

export default function ResendFailedLeadsButton() {
  const { slug } = useParams<{ slug?: string }>();
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [busy, setBusy] = useState<string | null>(null);

  if (slug !== "api::lead.lead") return null;

  const run = async (status: "failed" | "unrouted", label: string) => {
    if (!window.confirm(`¿Reenviar a Sinco los leads ${label}? Se intentan hasta 50 por vez.`))
      return;
    setBusy(status);
    try {
      const { data } = await post<{ data: BulkData }>(`/leads/resend-crm?status=${status}`);
      const { attempted, counts, remaining } = data.data;
      const detail = Object.entries(counts)
        .map(([key, n]) => `${n} ${LABELS[key] ?? key}`)
        .join(", ");
      toggleNotification({
        type: remaining > 0 ? "warning" : "success",
        message:
          attempted === 0
            ? `No había leads ${label}.`
            : `Reenviados ${attempted}: ${detail}. Quedan ${remaining}${remaining > 0 ? " — pulsa otra vez" : ""}.`,
      });
      if (attempted > 0) window.setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "No se pudo reenviar. Revisa el registro de tareas.";
      toggleNotification({ type: "danger", message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Flex gap={2}>
      <Button
        variant="secondary"
        onClick={() => run("failed", "que fallaron")}
        loading={busy === "failed"}
        disabled={busy !== null}
      >
        Reenviar fallidos
      </Button>
      <Button
        variant="secondary"
        onClick={() => run("unrouted", "sin proyecto")}
        loading={busy === "unrouted"}
        disabled={busy !== null}
      >
        Reenviar sin proyecto
      </Button>
    </Flex>
  );
}
