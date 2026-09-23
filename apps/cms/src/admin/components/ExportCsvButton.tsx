import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Button } from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";

/**
 * «Exportar CSV» on the list views of the collections that hold what the site
 * receives. It sends the list's own query string — filters, sort, search — to
 * `GET /exports/:collection`, so the file holds exactly the rows on screen.
 *
 * Fetched rather than linked: an `<a href>` would not carry the admin JWT.
 */
const COLLECTIONS: Record<string, string> = {
  "api::lead.lead": "leads",
  "api::pqr.pqr": "pqrs",
  "api::newsletter-subscriber.newsletter-subscriber": "newsletter-subscribers",
  "api::faq-bot-question.faq-bot-question": "faq-bot-questions",
};

export default function ExportCsvButton() {
  const { slug } = useParams<{ slug?: string }>();
  const { search } = useLocation();
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [loading, setLoading] = useState(false);

  const collection = slug ? COLLECTIONS[slug] : undefined;
  if (!collection) return null;

  const onClick = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(search);
      params.delete("page");
      params.delete("pageSize");
      const query = params.toString();
      // Same root-mounted admin router as the Sinco button: no /admin, no /api.
      const { data, headers } = await get<Blob>(
        `/exports/${collection}${query ? `?${query}` : ""}`,
        { responseType: "blob" },
      );
      const name =
        /filename="([^"]+)"/.exec(String(headers?.["content-disposition"] ?? ""))?.[1] ??
        `${collection}.csv`;
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "No se pudo exportar. Revisa los filtros e inténtalo de nuevo.";
      toggleNotification({ type: "danger", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="secondary" onClick={onClick} loading={loading}>
      Exportar CSV
    </Button>
  );
}
