import { useEffect, useState } from "react";

/**
 * Aviso permanente mientras el CMS siga teniendo el contenido de demo del seed.
 *
 * Existe porque el sitio ya está desplegado: mientras estos proyectos existan,
 * lo que se publica son nombres y PRECIOS INVENTADOS. Eso es fácil de olvidar
 * cuando el admin se ve lleno y funcionando, así que lo dice en pantalla en vez
 * de dejarlo a la memoria de alguien.
 *
 * Desaparece solo, sin tocar código, en cuanto se borra el último demo:
 *   cd apps/cms && bun run purge-demo --yes
 */

/** Los slugs exactos que crea seed.cjs. Ver scripts/purge-demo.cjs. */
const DEMO_SLUGS = [
  "reserva-de-los-alisos",
  "mirador-del-parque",
  "altos-de-la-sabana",
  "balcones-de-provenza",
  "sendero-del-rio",
  "portal-del-poblado",
];

export default function DemoContentBanner() {
  const [demoCount, setDemoCount] = useState<number | null>(null);

  useEffect(() => {
    const query = DEMO_SLUGS.map((slug, i) => `filters[$or][${i}][slug][$eq]=${slug}`).join("&");
    fetch(`/api/projects?${query}&pagination[pageSize]=1`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setDemoCount(body?.meta?.pagination?.total ?? 0))
      // Si la consulta falla no hay nada que avisar: mejor callar que mentir.
      .catch(() => setDemoCount(0));
  }, []);

  if (!demoCount) return null;

  return (
    <div
      style={{
        background: "#FDF3E7",
        border: "1px solid #E0A96D",
        borderRadius: 4,
        padding: "12px 16px",
        margin: "0 0 16px",
        fontSize: 14,
        lineHeight: 1.5,
        color: "#4A3520",
      }}
    >
      <strong>Todavía hay contenido de prueba publicado.</strong> Quedan {demoCount} proyecto(s) del
      seed de demostración, con nombres y <strong>precios inventados</strong>, y el sitio los está
      mostrando. Cárgalos reales y bórralos con <code>bun run purge-demo --yes</code> desde{" "}
      <code>apps/cms</code>.
    </div>
  );
}
