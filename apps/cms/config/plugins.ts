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
  const smtpHost = env("SMTP_HOST", "");

  return {
    "users-permissions": {
      config: {
        jwtManagement: "refresh",
        sessions: {
          httpOnly: true,
        },
      },
    },
    email: {
      config: {
        provider: "nodemailer",
        providerOptions: smtpHost
          ? {
              host: smtpHost,
              port: env.int("SMTP_PORT", 587),
              auth: {
                user: env("SMTP_USERNAME", ""),
                pass: env("SMTP_PASSWORD", ""),
              },
            }
          : // No SMTP configured (local dev): emails are rendered as JSON in the
            // logs instead of being sent.
            { jsonTransport: true },
        settings: {
          defaultFrom: env("EMAIL_FROM", "no-reply@lasgalias.com"),
          defaultReplyTo: env("EMAIL_REPLY_TO", "no-reply@lasgalias.com"),
        },
      },
    },
    upload: {
      config: {
        // Max upload size for every image/media field (requirement).
        sizeLimit: env.int("UPLOAD_MAX_BYTES", 2 * 1024 * 1024),
        // Only a thumbnail for the admin: final resize/format is done by the
        // Vercel image CDN, not sharp on Fargate (saves CPU and S3).
        breakpoints: {
          thumbnail: 245,
        },
        security: {
          allowedTypes: allowedMediaTypes,
          deniedTypes: deniedExecutableTypes,
        },
        // With UPLOADS_BUCKET set (AWS via SST) uploads go to S3; without it
        // (local dev) the default disk provider is used.
        ...(uploadsBucket
          ? {
              provider: "aws-s3",
              providerOptions: {
                s3Options: {
                  region: env("AWS_REGION", "us-east-1"),
                  params: {
                    Bucket: uploadsBucket,
                    // SST buckets have ACLs disabled (Bucket owner enforced) and are
                    // public via bucket policy. The provider only skips its default
                    // "public-read" ACL when the ACL key is present — a null value
                    // keeps the key but sends no ACL header.
                    ACL: null,
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
