import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

/**
 * Images keep the 2 MB requirement: the site serves them through Vercel's image
 * CDN and a heavier original only costs storage. Documents get the plugin's
 * global `sizeLimit` (`UPLOAD_MAX_BYTES`) instead — the projects' brochures are
 * print PDFs of 4–25 MB and cannot be shrunk to 2 MB without ruining them.
 */
const IMAGE_MAX_BYTES = Number(process.env.UPLOAD_IMAGE_MAX_BYTES) || 2 * 1024 * 1024;

interface UploadedFile {
  /** Strapi hands the size in KB. */
  size: number;
  mime?: string;
  name?: string;
}

export function applyUploadLimits(strapi: Core.Strapi): void {
  const provider = strapi.plugin("upload").provider as {
    checkFileSize: (file: UploadedFile, options: { sizeLimit?: number }) => void;
    extend: (overrides: Record<string, unknown>) => void;
  };
  const checkGlobal = provider.checkFileSize.bind(provider);

  provider.extend({
    checkFileSize(file: UploadedFile, options: { sizeLimit?: number }) {
      if (file.mime?.startsWith("image/") && file.size * 1024 > IMAGE_MAX_BYTES) {
        throw new errors.PayloadTooLargeError(
          `${file.name ?? "La imagen"} pesa más de ${IMAGE_MAX_BYTES / 1024 / 1024} MB.`,
        );
      }
      checkGlobal(file, options);
    },
  });
}
