/// <reference path="./.sst/platform/config.d.ts" />

/**
 * CMS (Strapi) infrastructure on AWS. Everything is created in the account of
 * the active AWS_PROFILE — SST bootstraps its state in the target account on
 * the first deploy:
 *
 *   AWS_PROFILE=<profile> bunx sst secret set StrapiAppKeys "$(openssl rand -base64 32),$(openssl rand -base64 32)" --stage production
 *   ... (remaining secrets, see below)
 *   AWS_PROFILE=<profile> bunx sst deploy --stage production
 *
 * Dev cost profile: Fargate 0.25 vCPU single task + RDS t4g.micro single-AZ
 * + NAT instance ≈ USD 40-45/month.
 */
export default $config({
  app(input) {
    return {
      name: "las-galias",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {
          region: "us-east-1",
        },
      },
    };
  },
  async run() {
    // bastion reuses the NAT instance that already exists (no extra cost) and is
    // the only way to run SQL against the stage database.
    const vpc = new sst.aws.Vpc("Vpc", { nat: "ec2", bastion: true });

    const db = new sst.aws.Postgres("Db", {
      vpc,
      instance: "t4g.micro",
      storage: "20 GB",
      database: "lasgalias",
    });

    const uploads = new sst.aws.Bucket("Uploads", { access: "public" });

    const appKeys = new sst.Secret("StrapiAppKeys");
    const adminJwtSecret = new sst.Secret("StrapiAdminJwtSecret");
    const apiTokenSalt = new sst.Secret("StrapiApiTokenSalt");
    const jwtSecret = new sst.Secret("StrapiJwtSecret");
    const transferTokenSalt = new sst.Secret("StrapiTransferTokenSalt");
    const encryptionKey = new sst.Secret("StrapiEncryptionKey");
    // Placeholder until the Vercel Deploy Hook exists; with "" Strapi skips rebuild triggers.
    const deployHookUrl = new sst.Secret("VercelDeployHookUrl", "");
    // Sinco CBR/CRM. Empty by default so a stage without credentials still
    // deploys — the providers stay on "manual" and nothing calls out.
    const sincoBaseUrl = new sst.Secret("SincoBaseUrl", "");
    const sincoUser = new sst.Secret("SincoUser", "");
    const sincoPassword = new sst.Secret("SincoPassword", "");
    // Multi-database login (HTTP 300) and lead attribution. Left empty on
    // purpose where the environment answers 200 — guessing ids breaks the login.
    const sincoIdOrigen = new sst.Secret("SincoIdOrigen", "");
    const sincoIdEmpresa = new sst.Secret("SincoIdEmpresa", "");
    const sincoIdSucursal = new sst.Secret("SincoIdSucursal", "");
    const sincoLeadOrigen = new sst.Secret("SincoLeadOrigenInformacion", "");
    const sincoLeadMedio = new sst.Secret("SincoLeadMedioPublicitario", "");

    // Strategy selection lives in runtime (createLeadProvider(process.env)), so
    // SST only has to carry the string. Default "manual" so a brand-new stage
    // never calls a CRM by accident.
    const leadProvider = new sst.Secret("LeadProvider", "manual");
    const projectDataProvider = new sst.Secret("ProjectDataProvider", "manual");
    // Strapi's own public URL. Chicken-and-egg with the CDN below (the CDN's
    // origin is this service), so it is set on a second pass:
    //   deploy → read cmsHttpsUrl → sst secret set CmsPublicUrl → deploy again.
    const cmsPublicUrl = new sst.Secret("CmsPublicUrl", "");

    // Vercel AI Gateway key for the FAQ assistant. Empty by default so a stage
    // without it simply cannot answer (the endpoint falls back) instead of
    // failing to deploy — the assistant is optional, the CMS is not.
    const aiGatewayApiKey = new sst.Secret("AiGatewayApiKey", "");

    // Origins allowed to call this CMS from a browser (lead form, assistant).
    // EMPTY MEANS "*", which is what the site needs today: it is served from a
    // *.vercel.app URL that changes per deploy, so hard-coding the final domain
    // here would block the live site. Set it the day the real domain is wired:
    //   bunx sst secret set CorsOrigins "https://lasgalias.com,https://www.lasgalias.com" --stage production
    const corsOrigins = new sst.Secret("CorsOrigins", "");

    // Guardrails that Pulumi always evaluates, because the resolved value IS
    // what the Service consumes — a throw here fails the deploy instead of
    // publishing a broken stage.
    const leadProviderChecked = $resolve([leadProvider.value, sincoBaseUrl.value]).apply(
      ([provider, baseUrl]) => {
        if (provider !== "manual" && provider !== "sinco")
          throw new Error(`LeadProvider debe ser "manual" o "sinco", llegó "${provider}"`);
        if (provider === "sinco" && !baseUrl)
          throw new Error(`LeadProvider es "sinco" pero SincoBaseUrl está vacío en ${$app.stage}`);
        // Sinco ids are NOT portable between environments: the same id is a
        // different project in pruebas and in production.
        if ($app.stage === "production" && baseUrl.includes("pruebas"))
          throw new Error(`El stage "production" está apuntando al Sinco de *pruebas*.`);
        return provider;
      },
    );

    const projectDataProviderChecked = $resolve([
      projectDataProvider.value,
      sincoBaseUrl.value,
    ]).apply(([provider, baseUrl]) => {
      if (provider !== "manual" && provider !== "sinco")
        throw new Error(`ProjectDataProvider debe ser "manual" o "sinco", llegó "${provider}"`);
      if (provider === "sinco" && !baseUrl)
        throw new Error(
          `ProjectDataProvider es "sinco" pero SincoBaseUrl está vacío en ${$app.stage}`,
        );
      return provider;
    });

    const cluster = new sst.aws.Cluster("Cluster", { vpc });

    const cms = new sst.aws.Service("Cms", {
      cluster,
      cpu: "0.25 vCPU",
      memory: "1 GB",
      architecture: "arm64",
      image: {
        context: ".",
        dockerfile: "apps/cms/Dockerfile",
      },
      link: [uploads],
      environment: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "1337",
        APP_KEYS: appKeys.value,
        ADMIN_JWT_SECRET: adminJwtSecret.value,
        API_TOKEN_SALT: apiTokenSalt.value,
        JWT_SECRET: jwtSecret.value,
        TRANSFER_TOKEN_SALT: transferTokenSalt.value,
        ENCRYPTION_KEY: encryptionKey.value,
        DATABASE_CLIENT: "postgres",
        DATABASE_HOST: db.host,
        DATABASE_PORT: $interpolate`${db.port}`,
        DATABASE_NAME: db.database,
        DATABASE_USERNAME: db.username,
        DATABASE_PASSWORD: db.password,
        DATABASE_SSL: "true",
        DATABASE_SSL_REJECT_UNAUTHORIZED: "false",
        UPLOADS_BUCKET: uploads.name,
        AWS_REGION: "us-east-1",
        PROJECT_DATA_PROVIDER: projectDataProviderChecked,
        LEAD_PROVIDER: leadProviderChecked,
        SINCO_BASE_URL: sincoBaseUrl.value,
        SINCO_USER: sincoUser.value,
        SINCO_PASSWORD: sincoPassword.value,
        SINCO_ID_ORIGEN: sincoIdOrigen.value,
        SINCO_ID_EMPRESA: sincoIdEmpresa.value,
        SINCO_ID_SUCURSAL: sincoIdSucursal.value,
        SINCO_LEAD_ORIGEN_INFORMACION: sincoLeadOrigen.value,
        SINCO_LEAD_MEDIO_PUBLICITARIO: sincoLeadMedio.value,
        VERCEL_DEPLOY_HOOK_URL: deployHookUrl.value,
        AI_GATEWAY_API_KEY: aiGatewayApiKey.value,
        CORS_ORIGINS: corsOrigins.value,
        // Absolute URL Strapi builds its links with (admin, media, webhooks).
        PUBLIC_URL: cmsPublicUrl.value,
        // The lead retry cron and the daily rates cron run in this container.
        CRON_ENABLED: "true",
        UPLOAD_MAX_BYTES: String(10 * 1024 * 1024),
        SHARP_CONCURRENCY: "1",
        // Sits behind CloudFront → trust X-Forwarded-* (see config/server.ts).
        IS_PROXIED: "true",
      },
      loadBalancer: {
        rules: [{ listen: "80/http", forward: "1337/http" }],
        // Strapi "/" redirects (not 200), so point the ELB health check at the
        // dedicated /_health endpoint (returns 204) and tolerate slow responses
        // during heavy ops (data transfer, image processing) with a generous
        // unhealthy threshold — otherwise ECS keeps killing the single task.
        health: {
          "1337/http": {
            path: "/_health",
            successCodes: "200-299",
            interval: "30 seconds",
            timeout: "10 seconds",
            healthyThreshold: 2,
            unhealthyThreshold: 5,
          },
        },
      },
      scaling: { min: 1, max: 1 },
    });

    // CloudFront in front of the (HTTP) load balancer to give the CMS HTTPS
    // with no custom domain — uses the default *.cloudfront.net certificate.
    // Viewer→CloudFront is HTTPS; CloudFront→ALB stays HTTP inside AWS.
    // Caching is disabled (it's an API/admin) and all viewer data is forwarded.
    const cdn = new aws.cloudfront.Distribution("CmsCdn", {
      enabled: true,
      waitForDeployment: false,
      origins: [
        {
          originId: "cms-alb",
          domainName: cms.nodes.loadBalancer.dnsName,
          customOriginConfig: {
            httpPort: 80,
            httpsPort: 443,
            originProtocolPolicy: "http-only",
            originSslProtocols: ["TLSv1.2"],
          },
        },
      ],
      defaultCacheBehavior: {
        targetOriginId: "cms-alb",
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
        cachedMethods: ["GET", "HEAD"],
        compress: true,
        // Managed policies: CachingDisabled + AllViewer (forward everything).
        cachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
        originRequestPolicyId: "216adef6-5c7f-47e4-b989-5492eafa07d3",
      },
      restrictions: { geoRestriction: { restrictionType: "none" } },
      viewerCertificate: { cloudfrontDefaultCertificate: true },
    });

    return {
      cmsUrl: cms.url,
      cmsHttpsUrl: $interpolate`https://${cdn.domainName}`,
      uploadsBucket: uploads.name,
    };
  },
});
