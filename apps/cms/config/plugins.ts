import type { Core } from "@strapi/strapi";

const allowedMediaTypes = ["image/*", "video/*", "application/pdf"];

const deniedExecutableTypes = [
  "application/vnd.microsoft.portable-executable",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-executable",
  "application/x-dosexec",
  "application/x-sh",
  "text/x-shellscript",
  "application/x-mach-binary",
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  const uploadsBucket = env("UPLOADS_BUCKET", "");

  return {
    "users-permissions": {
      config: {
        jwtManagement: "refresh",
        sessions: {
          httpOnly: true,
        },
      },
    },
    upload: {
      config: {
        // Límite máximo de peso para todos los campos de imagen/media (requisito).
        sizeLimit: env.int("UPLOAD_MAX_BYTES", 2 * 1024 * 1024),
        // Solo thumbnail para el admin: el resize/format final lo hace la CDN de
        // imágenes de Vercel, no sharp en Fargate (ahorra CPU y S3).
        breakpoints: {
          thumbnail: 245,
        },
        security: {
          allowedTypes: allowedMediaTypes,
          deniedTypes: deniedExecutableTypes,
        },
        // Con UPLOADS_BUCKET definido (AWS vía SST) sube a S3; sin él (dev local)
        // usa el provider de disco por defecto.
        ...(uploadsBucket
          ? {
              provider: "aws-s3",
              providerOptions: {
                s3Options: {
                  region: env("AWS_REGION", "us-east-1"),
                  params: {
                    Bucket: uploadsBucket,
                  },
                },
              },
              actionOptions: {
                upload: {},
                uploadStream: {},
                delete: {},
              },
            }
          : {}),
      },
    },
  };
};

export default config;
