import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

/**
 * Business rule for `legal-document`. Its text lives in one of two fields —
 * `bodyMarkdown` (pasted, the only one that holds tables) or `body` (the
 * blocks editor) — so neither can be `required` in the schema and the check
 * that used to be the schema's happens here, on publish.
 */

export const LEGAL_DOCUMENT_UID = "api::legal-document.legal-document";

interface DocParams {
  documentId?: string;
}

/** Rule: a legal document cannot publish as an empty page. */
export async function validateLegalDocumentOnPublish(
  strapi: Core.Strapi,
  params: DocParams,
): Promise<void> {
  if (!params.documentId) return;
  const doc = await strapi.documents(LEGAL_DOCUMENT_UID).findOne({
    documentId: params.documentId,
  });
  if (!doc) return;
  const hasMarkdown = Boolean(doc.bodyMarkdown?.trim());
  const hasBlocks = Array.isArray(doc.body) && doc.body.length > 0;
  if (!hasMarkdown && !hasBlocks) {
    throw new errors.ValidationError(
      "No se puede publicar el documento sin texto: pega el markdown o escríbelo en el editor.",
    );
  }
}
