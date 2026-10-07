import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Button, Flex, Typography } from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";

/**
 * The panel on an integration's edit view: what to send the partner, and how
 * its deliveries are doing.
 *
 * The address and the message are built by the server (it knows the CMS's
 * public URL and holds the key), so sharing an integration is one click on
 * «Copiar instrucciones» and a paste into an email. The key is only ever
 * generated — the field in the form is read-only.
 */
const UID = "api::lead-integration.lead-integration";
const LEADS = "/content-manager/collection-types/api::lead.lead";
const REQUESTS =
  "/content-manager/collection-types/api::lead-integration-request.lead-integration-request";

interface Summary {
  name: string;
  enabled: boolean;
  url: string;
  apiKey: string | null;
  instructions: string | null;
  aiPrompt: string;
  lastLeadAt: string | null;
  leads: { today: number; week: number; month: number; total: number };
  crm: Record<string, number>;
  requests: { accepted: number; duplicate: number; refused: Record<string, number> };
}

const CRM_LABELS: Record<string, string> = {
  sent: "enviados a Sinco",
  duplicate: "ya estaban en Sinco",
  pending: "por enviar",
  failed: "fallaron",
  unrouted: "sin proyecto",
  skipped: "solo en Strapi",
};

const REFUSAL_LABELS: Record<string, string> = {
  invalid: "datos inválidos",
  unauthorized: "clave incorrecta",
  disabled: "integración apagada",
  origin: "origen no permitido",
  ip: "IP no permitida",
  rate: "límite por minuto",
  cap: "límite diario",
};

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message ?? fallback;

const list = (counts: Record<string, number>, labels: Record<string, string>) =>
  Object.entries(counts)
    .map(([key, n]) => `${n} ${labels[key] ?? key}`)
    .join(" · ");

export default function LeadIntegrationPanel() {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rotating, setRotating] = useState(false);

  const active = slug === UID && Boolean(id) && id !== "create";

  const load = useCallback(async () => {
    try {
      const { data } = await get<{ data: Summary }>(`/lead-integrations/${id}/summary`);
      setSummary(data.data);
    } catch (err) {
      toggleNotification({
        type: "danger",
        message: errorMessage(err, "No se pudo cargar la integración."),
      });
    }
  }, [get, id, toggleNotification]);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  // The zone renders for every content type; this panel is integration-only.
  if (slug !== UID) return null;

  if (!active) {
    return (
      <Typography variant="pi" textColor="neutral600">
        Guarda la integración para generar su clave y ver la URL que se le envía al aliado.
      </Typography>
    );
  }
  if (!summary) return null;

  const copy = async (text: string | null, what: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toggleNotification({ type: "success", message: `${what} en el portapapeles.` });
    } catch {
      toggleNotification({ type: "danger", message: "El navegador no dejó copiar." });
    }
  };

  const rotate = async () => {
    const sure = window.confirm(
      "¿Generar una clave nueva? La actual deja de funcionar de inmediato y hay que enviarle la nueva al aliado.",
    );
    if (!sure) return;
    setRotating(true);
    try {
      await post(`/lead-integrations/${id}/rotate-key`);
      toggleNotification({ type: "success", message: "Clave nueva generada. Recargando…" });
      // The form on the left still holds the old key; saving it would put it back.
      window.setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      toggleNotification({
        type: "danger",
        message: errorMessage(err, "No se pudo generar la clave."),
      });
      setRotating(false);
    }
  };

  const filter = `filters[$and][0][integration][documentId][$eq]=${id}`;
  const refused = Object.values(summary.requests.refused).reduce((a, b) => a + b, 0);

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Typography variant="sigma" textColor="neutral600">
        Compartir con el aliado
      </Typography>
      <Typography variant="pi" textColor="neutral800" style={{ wordBreak: "break-all" }}>
        {summary.url}
      </Typography>
      <Button
        variant="default"
        onClick={() => copy(summary.instructions, "Instrucciones")}
        disabled={!summary.instructions}
        fullWidth
      >
        Copiar instrucciones
      </Button>
      <Button
        variant="secondary"
        onClick={() => copy(summary.aiPrompt, "Prompt para IA")}
        fullWidth
      >
        Copiar prompt para IA
      </Button>
      <Flex gap={2}>
        <Button variant="tertiary" onClick={() => copy(summary.url, "URL")} fullWidth>
          Copiar URL
        </Button>
        <Button
          variant="tertiary"
          onClick={() => copy(summary.apiKey, "Clave")}
          disabled={!summary.apiKey}
          fullWidth
        >
          Copiar clave
        </Button>
      </Flex>
      <Button variant="danger-light" onClick={rotate} loading={rotating} fullWidth>
        Generar clave nueva
      </Button>
      <Typography variant="pi" textColor="neutral600">
        «Copiar instrucciones» lleva la URL, la clave, los campos con sus validaciones, las
        respuestas y un ejemplo: se pega en un correo tal cual. El prompt para IA es el mismo
        contrato, con la clave, para que el aliado lo pegue en su asistente de código.
        {summary.enabled ? "" : " La integración está apagada: enciéndela para que reciba leads."}
      </Typography>

      <Typography variant="sigma" textColor="neutral600">
        Leads recibidos
      </Typography>
      <Typography variant="pi" textColor="neutral800">
        Hoy {summary.leads.today} · 7 días {summary.leads.week} · 30 días {summary.leads.month} ·
        total {summary.leads.total}
      </Typography>
      {Object.keys(summary.crm).length > 0 && (
        <Typography variant="pi" textColor="neutral600">
          {list(summary.crm, CRM_LABELS)}
        </Typography>
      )}
      <Typography variant="pi" textColor="neutral600">
        {summary.lastLeadAt
          ? `Último: ${new Date(summary.lastLeadAt).toLocaleString("es-CO")}`
          : "Todavía no ha llegado ninguno."}
      </Typography>
      <RouterLink to={`${LEADS}?${filter}`}>
        <Typography variant="pi" textColor="primary600">
          Ver sus leads →
        </Typography>
      </RouterLink>

      <Typography variant="sigma" textColor="neutral600">
        Peticiones · últimos 7 días
      </Typography>
      <Typography variant="pi" textColor="neutral800">
        {summary.requests.accepted} aceptadas · {summary.requests.duplicate} repetidas · {refused}{" "}
        rechazadas
      </Typography>
      {refused > 0 && (
        <Typography variant="pi" textColor="danger600">
          {list(summary.requests.refused, REFUSAL_LABELS)}
        </Typography>
      )}
      <RouterLink to={`${REQUESTS}?${filter}`}>
        <Typography variant="pi" textColor="primary600">
          Ver sus peticiones →
        </Typography>
      </RouterLink>
    </Flex>
  );
}
