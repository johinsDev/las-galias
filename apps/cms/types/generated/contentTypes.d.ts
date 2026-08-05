import type { Schema, Struct } from "@strapi/strapi";

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: "strapi_api_tokens";
  info: {
    description: "";
    displayName: "Api Token";
    name: "Api Token";
    pluralName: "api-tokens";
    singularName: "api-token";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    adminPermissions: Schema.Attribute.Relation<"oneToMany", "admin::permission">;
    adminUserOwner: Schema.Attribute.Relation<"manyToOne", "admin::user">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<"">;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    kind: Schema.Attribute.Enumeration<["content-api", "admin"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"content-api">;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::api-token"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<"oneToMany", "admin::api-token-permission">;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<["read-only", "full-access", "custom"]> &
      Schema.Attribute.DefaultTo<"read-only">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: "strapi_api_token_permissions";
  info: {
    description: "";
    displayName: "API Token Permission";
    name: "API Token Permission";
    pluralName: "api-token-permissions";
    singularName: "api-token-permission";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::api-token-permission"> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<"manyToOne", "admin::api-token">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: "admin_permissions";
  info: {
    description: "";
    displayName: "Permission";
    name: "Permission";
    pluralName: "permissions";
    singularName: "permission";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    apiToken: Schema.Attribute.Relation<"manyToOne", "admin::api-token">;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::permission"> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<"manyToOne", "admin::role">;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: "admin_roles";
  info: {
    description: "";
    displayName: "Role";
    name: "Role";
    pluralName: "roles";
    singularName: "role";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::role"> & Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<"oneToMany", "admin::permission">;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    users: Schema.Attribute.Relation<"manyToMany", "admin::user">;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: "strapi_sessions";
  info: {
    description: "Session Manager storage";
    displayName: "Session";
    name: "Session";
    pluralName: "sessions";
    singularName: "session";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    deviceId: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime & Schema.Attribute.Required & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::session"> &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON & Schema.Attribute.Private;
    origin: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    userId: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: "strapi_transfer_tokens";
  info: {
    description: "";
    displayName: "Transfer Token";
    name: "Transfer Token";
    pluralName: "transfer-tokens";
    singularName: "transfer-token";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<"">;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::transfer-token"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<"oneToMany", "admin::transfer-token-permission">;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: "strapi_transfer_token_permissions";
  info: {
    description: "";
    displayName: "Transfer Token Permission";
    name: "Transfer Token Permission";
    pluralName: "transfer-token-permissions";
    singularName: "transfer-token-permission";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::transfer-token-permission"> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<"manyToOne", "admin::transfer-token">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: "admin_users";
  info: {
    description: "";
    displayName: "User";
    name: "User";
    pluralName: "users";
    singularName: "user";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    apiTokens: Schema.Attribute.Relation<"oneToMany", "admin::api-token"> &
      Schema.Attribute.Private;
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::user"> & Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<"manyToMany", "admin::role"> & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiAmenityAmenity extends Struct.CollectionTypeSchema {
  collectionName: "amenities";
  info: {
    description: "Common areas reusable across projects (pool, gym, etc.)";
    displayName: "Zona com\u00FAn";
    pluralName: "amenities";
    singularName: "amenity";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<"images">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::amenity.amenity"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    projects: Schema.Attribute.Relation<"manyToMany", "api::project.project">;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiCalculatorConfigCalculatorConfig extends Struct.SingleTypeSchema {
  collectionName: "calculator_config";
  info: {
    description: "Mortgage calculator parameters. Admins only";
    displayName: "Configuraci\u00F3n del simulador";
    pluralName: "calculator-configs";
    singularName: "calculator-config";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    annualInterestRate: Schema.Attribute.Decimal & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::calculator-config.calculator-config"
    > &
      Schema.Attribute.Private;
    maxFinancingPercent: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<70>;
    maxTermYears: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<20>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiCityCity extends Struct.CollectionTypeSchema {
  collectionName: "cities";
  info: {
    description: "Cities where Las Galias builds projects";
    displayName: "Ciudad";
    pluralName: "cities";
    singularName: "city";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    department: Schema.Attribute.String;
    image: Schema.Attribute.Media<"images">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::city.city"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    projects: Schema.Attribute.Relation<"oneToMany", "api::project.project">;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<"name"> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiExchangeRateExchangeRate extends Struct.SingleTypeSchema {
  collectionName: "exchange_rates";
  info: {
    description: "COP\u2192USD/EUR rates populated by the daily cron (TRM + ECB). Admins only";
    displayName: "Tasa de cambio";
    pluralName: "exchange-rates";
    singularName: "exchange-rate";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    copPerEur: Schema.Attribute.Decimal;
    copPerUsd: Schema.Attribute.Decimal;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    eurSource: Schema.Attribute.String;
    fetchedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::exchange-rate.exchange-rate"> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    usdSource: Schema.Attribute.String;
    validFrom: Schema.Attribute.DateTime;
  };
}

export interface ApiFaqFaq extends Struct.CollectionTypeSchema {
  collectionName: "faqs";
  info: {
    description: "Accordion questions. `audience` scopes them to a page \u2014 the foreign-buyer landing renders audience=exterior";
    displayName: "Pregunta frecuente";
    pluralName: "faqs";
    singularName: "faq";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    answer: Schema.Attribute.Blocks & Schema.Attribute.Required;
    audience: Schema.Attribute.Enumeration<["general", "exterior"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"general">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::faq.faq"> &
      Schema.Attribute.Private;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    question: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiForeignBuyerPageForeignBuyerPage extends Struct.SingleTypeSchema {
  collectionName: "foreign_buyer_page";
  info: {
    description: "The 'Colombianos en el exterior' landing. Its FAQ lives in the faq collection with audience=exterior; the project cards are the regular published projects, priced in USD off the daily exchange-rate";
    displayName: "P\u00E1gina \u00B7 Compra desde el exterior";
    pluralName: "foreign-buyer-pages";
    singularName: "foreign-buyer-page";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    eyebrow: Schema.Attribute.String & Schema.Attribute.DefaultTo<"Colombianos en el exterior">;
    formBody: Schema.Attribute.Text;
    formBullets: Schema.Attribute.Component<"page.list-item", true>;
    formTitle: Schema.Attribute.String;
    heroCtaLabel: Schema.Attribute.String & Schema.Attribute.DefaultTo<"D\u00E9janos tus datos">;
    heroImage: Schema.Attribute.Media<"images">;
    heroSubtitle: Schema.Attribute.Text;
    heroTitle: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::foreign-buyer-page.foreign-buyer-page"
    > &
      Schema.Attribute.Private;
    priceDisclaimer: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    seo: Schema.Attribute.Component<"shared.seo", false>;
    steps: Schema.Attribute.Component<"page.step", true>;
    stepsTitle: Schema.Attribute.String & Schema.Attribute.DefaultTo<"Conoce el paso a paso">;
    trustBadges: Schema.Attribute.Component<"page.list-item", true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiHomeBannerHomeBanner extends Struct.CollectionTypeSchema {
  collectionName: "home_banners";
  info: {
    description: "Home banners with dedicated desktop and mobile images";
    displayName: "Banner del home";
    pluralName: "home-banners";
    singularName: "home-banner";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    desktopImage: Schema.Attribute.Media<"images"> & Schema.Attribute.Required;
    link: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::home-banner.home-banner"> &
      Schema.Attribute.Private;
    mobileImage: Schema.Attribute.Media<"images"> & Schema.Attribute.Required;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiJobRunJobRun extends Struct.CollectionTypeSchema {
  collectionName: "job_runs";
  info: {
    description: "Bit\u00E1cora de los procesos autom\u00E1ticos (crons y sincronizaciones). Se ve en el Content Manager para no tener que entrar al servidor por SSH";
    displayName: "Registro de tareas";
    pluralName: "job-runs";
    singularName: "job-run";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    durationMs: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::job-run.job-run"> &
      Schema.Attribute.Private;
    message: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    ranAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<["ok", "error", "skipped"]> & Schema.Attribute.Required;
    task: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiLeadLead extends Struct.CollectionTypeSchema {
  collectionName: "leads";
  info: {
    description: "Form submissions saved from PDPs (especially expectation-stage projects) and pushed to the Sinco CRM";
    displayName: "Lead";
    pluralName: "leads";
    singularName: "lead";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    acceptsCall: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    acceptsDataPolicy: Schema.Attribute.Boolean & Schema.Attribute.Required;
    acceptsEmail: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    acceptsSms: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    acceptsWhatsApp: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    crmAttempts: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    crmLastError: Schema.Attribute.Text;
    crmStatus: Schema.Attribute.Enumeration<["pending", "sent", "duplicate", "failed", "skipped"]> &
      Schema.Attribute.DefaultTo<"pending">;
    crmVisitId: Schema.Attribute.String;
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::lead.lead"> &
      Schema.Attribute.Private;
    message: Schema.Attribute.Text;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String & Schema.Attribute.Required;
    project: Schema.Attribute.Relation<"manyToOne", "api::project.project">;
    publishedAt: Schema.Attribute.DateTime;
    residenceCountry: Schema.Attribute.String;
    source: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    utmCampaign: Schema.Attribute.String;
    utmMedium: Schema.Attribute.String;
    utmSource: Schema.Attribute.String;
  };
}

export interface ApiMacroprojectMacroproject extends Struct.CollectionTypeSchema {
  collectionName: "macroprojects";
  info: {
    description: "Master developments that group projects and points of interest of a single location";
    displayName: "Macroproyecto";
    pluralName: "macroprojects";
    singularName: "macroproject";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    city: Schema.Attribute.Relation<"manyToOne", "api::city.city">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.Blocks;
    gallery: Schema.Attribute.Media<"images", true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::macroproject.macroproject"> &
      Schema.Attribute.Private;
    location: Schema.Attribute.Component<"shared.geo", false>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    pointsOfInterest: Schema.Attribute.Relation<
      "oneToMany",
      "api::point-of-interest.point-of-interest"
    >;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<"name"> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiPointOfInterestPointOfInterest extends Struct.CollectionTypeSchema {
  collectionName: "points_of_interest";
  info: {
    description: "Nearby points of interest; ALWAYS tied to a macroproject so locations never mix";
    displayName: "Punto de inter\u00E9s";
    pluralName: "points-of-interest";
    singularName: "point-of-interest";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    category: Schema.Attribute.Enumeration<
      ["commerce", "health", "education", "transport", "recreation"]
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    distanceText: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::point-of-interest.point-of-interest"
    > &
      Schema.Attribute.Private;
    macroproject: Schema.Attribute.Relation<"manyToOne", "api::macroproject.macroproject"> &
      Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiPostPost extends Struct.CollectionTypeSchema {
  collectionName: "posts";
  info: {
    description: "Blog posts";
    displayName: "Art\u00EDculo del blog";
    pluralName: "posts";
    singularName: "post";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    category: Schema.Attribute.Enumeration<["financiacion", "guia-de-compra", "mercado"]>;
    content: Schema.Attribute.Blocks;
    cover: Schema.Attribute.Media<"images">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    excerpt: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::post.post"> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    publishedOn: Schema.Attribute.Date;
    seo: Schema.Attribute.Component<"shared.seo", false>;
    slug: Schema.Attribute.UID<"title"> & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiProjectProject extends Struct.CollectionTypeSchema {
  collectionName: "projects";
  info: {
    description: "Real-estate projects. stage=expectation publishes with fewer required fields; stage=sale requires the full listing";
    displayName: "Proyecto";
    pluralName: "projects";
    singularName: "project";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    amenities: Schema.Attribute.Relation<"manyToMany", "api::amenity.amenity">;
    appliesSubsidy: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    city: Schema.Attribute.Relation<"manyToOne", "api::city.city"> & Schema.Attribute.Required;
    constructionProgress: Schema.Attribute.Component<"project.construction-progress", true>;
    constructionStatus: Schema.Attribute.Enumeration<
      ["launch", "presale", "construction", "immediate-delivery"]
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.Blocks;
    financing: Schema.Attribute.Component<"project.financing", false>;
    gallery: Schema.Attribute.Media<"images", true>;
    hasDiscount: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    heroDesktop: Schema.Attribute.Media<"images">;
    heroMobile: Schema.Attribute.Media<"images">;
    lastUnits: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::project.project"> &
      Schema.Attribute.Private;
    location: Schema.Attribute.Component<"shared.geo", false>;
    logo: Schema.Attribute.Media<"images">;
    macroproject: Schema.Attribute.Relation<"manyToOne", "api::macroproject.macroproject">;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    neighborhood: Schema.Attribute.String;
    priceFromCOP: Schema.Attribute.BigInteger;
    priceFromSincoCOP: Schema.Attribute.BigInteger;
    priceLocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    publishedAt: Schema.Attribute.DateTime;
    recommended: Schema.Attribute.Relation<"oneToMany", "api::project.project">;
    salesRoom: Schema.Attribute.Component<"project.sales-room", false>;
    seo: Schema.Attribute.Component<"shared.seo", false>;
    sincoProject: Schema.Attribute.Relation<"oneToOne", "api::sinco-project.sinco-project">;
    slug: Schema.Attribute.UID<"name"> & Schema.Attribute.Required;
    specSheet: Schema.Attribute.Component<"project.spec-sheet", false>;
    stage: Schema.Attribute.Enumeration<["expectation", "sale"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"expectation">;
    syncFromSinco: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    tour360Url: Schema.Attribute.String;
    unitTypes: Schema.Attribute.Component<"project.unit-type", true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    video: Schema.Attribute.String;
    zone: Schema.Attribute.Relation<"manyToOne", "api::zone.zone">;
  };
}

export interface ApiRedirectRedirect extends Struct.CollectionTypeSchema {
  collectionName: "redirects";
  info: {
    description: "Site redirects. Admins only. source=auto-unpublish entries are created by the system when a project is unpublished";
    displayName: "Redirecci\u00F3n";
    pluralName: "redirects";
    singularName: "redirect";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    from: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::redirect.redirect"> &
      Schema.Attribute.Private;
    permanent: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    publishedAt: Schema.Attribute.DateTime;
    source: Schema.Attribute.Enumeration<["manual", "auto-unpublish"]> &
      Schema.Attribute.DefaultTo<"manual">;
    to: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiSincoProjectSincoProject extends Struct.CollectionTypeSchema {
  collectionName: "sinco_projects";
  info: {
    description: "Read-only mirror of the Sinco project catalog, refreshed from the API. Pick one on a project so leads reach the right sales room; do not edit by hand";
    displayName: "Proyecto de Sinco";
    pluralName: "sinco-projects";
    singularName: "sinco-project";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    lastSyncedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::sinco-project.sinco-project"> &
      Schema.Attribute.Private;
    macroName: Schema.Attribute.String;
    macroSincoId: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    sincoId: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiZoneZone extends Struct.CollectionTypeSchema {
  collectionName: "zones";
  info: {
    description: "Area within a city (Norte, Centro-Norte, Sur...). A content type and not a free-text field so the same zone reads identically across every project, and so listings can be filtered by it later";
    displayName: "Zona";
    pluralName: "zones";
    singularName: "zone";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    city: Schema.Attribute.Relation<"manyToOne", "api::city.city"> & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::zone.zone"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<"name"> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesRelease extends Struct.CollectionTypeSchema {
  collectionName: "strapi_releases";
  info: {
    displayName: "Release";
    pluralName: "releases";
    singularName: "release";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<"oneToMany", "plugin::content-releases.release-action">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::content-releases.release"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<["ready", "blocked", "failed", "done", "empty"]> &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction extends Struct.CollectionTypeSchema {
  collectionName: "strapi_release_actions";
  info: {
    displayName: "Release Action";
    pluralName: "release-actions";
    singularName: "release-action";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::content-releases.release-action"
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<"manyToOne", "plugin::content-releases.release">;
    type: Schema.Attribute.Enumeration<["publish", "unpublish"]> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: "i18n_locale";
  info: {
    collectionName: "locales";
    description: "";
    displayName: "Locale";
    pluralName: "locales";
    singularName: "locale";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::i18n.locale"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow extends Struct.CollectionTypeSchema {
  collectionName: "strapi_workflows";
  info: {
    description: "";
    displayName: "Workflow";
    name: "Workflow";
    pluralName: "workflows";
    singularName: "workflow";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"[]">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::review-workflows.workflow"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      "oneToOne",
      "plugin::review-workflows.workflow-stage"
    >;
    stages: Schema.Attribute.Relation<"oneToMany", "plugin::review-workflows.workflow-stage">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage extends Struct.CollectionTypeSchema {
  collectionName: "strapi_workflows_stages";
  info: {
    description: "";
    displayName: "Stages";
    name: "Workflow Stage";
    pluralName: "workflow-stages";
    singularName: "workflow-stage";
  };
  options: {
    draftAndPublish: false;
    version: "1.1.0";
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<"#4945FF">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::review-workflows.workflow-stage"
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<"manyToMany", "admin::permission">;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<"manyToOne", "plugin::review-workflows.workflow">;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: "files";
  info: {
    description: "";
    displayName: "File";
    pluralName: "files";
    singularName: "file";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<"manyToOne", "plugin::upload.folder"> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::upload.file"> &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<"morphToMany">;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: "upload_folders";
  info: {
    displayName: "Folder";
    pluralName: "folders";
    singularName: "folder";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<"oneToMany", "plugin::upload.folder">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    files: Schema.Attribute.Relation<"oneToMany", "plugin::upload.file">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::upload.folder"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<"manyToOne", "plugin::upload.folder">;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer & Schema.Attribute.Required & Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission extends Struct.CollectionTypeSchema {
  collectionName: "up_permissions";
  info: {
    description: "";
    displayName: "Permission";
    name: "permission";
    pluralName: "permissions";
    singularName: "permission";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::users-permissions.permission"> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.role">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole extends Struct.CollectionTypeSchema {
  collectionName: "up_roles";
  info: {
    description: "";
    displayName: "Role";
    name: "role";
    pluralName: "roles";
    singularName: "role";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::users-permissions.role"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<"oneToMany", "plugin::users-permissions.permission">;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    users: Schema.Attribute.Relation<"oneToMany", "plugin::users-permissions.user">;
  };
}

export interface PluginUsersPermissionsUser extends Struct.CollectionTypeSchema {
  collectionName: "up_users";
  info: {
    description: "";
    displayName: "User";
    name: "user";
    pluralName: "users";
    singularName: "user";
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::users-permissions.user"> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.role">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module "@strapi/strapi" {
  export namespace Public {
    export interface ContentTypeSchemas {
      "admin::api-token": AdminApiToken;
      "admin::api-token-permission": AdminApiTokenPermission;
      "admin::permission": AdminPermission;
      "admin::role": AdminRole;
      "admin::session": AdminSession;
      "admin::transfer-token": AdminTransferToken;
      "admin::transfer-token-permission": AdminTransferTokenPermission;
      "admin::user": AdminUser;
      "api::amenity.amenity": ApiAmenityAmenity;
      "api::calculator-config.calculator-config": ApiCalculatorConfigCalculatorConfig;
      "api::city.city": ApiCityCity;
      "api::exchange-rate.exchange-rate": ApiExchangeRateExchangeRate;
      "api::faq.faq": ApiFaqFaq;
      "api::foreign-buyer-page.foreign-buyer-page": ApiForeignBuyerPageForeignBuyerPage;
      "api::home-banner.home-banner": ApiHomeBannerHomeBanner;
      "api::job-run.job-run": ApiJobRunJobRun;
      "api::lead.lead": ApiLeadLead;
      "api::macroproject.macroproject": ApiMacroprojectMacroproject;
      "api::point-of-interest.point-of-interest": ApiPointOfInterestPointOfInterest;
      "api::post.post": ApiPostPost;
      "api::project.project": ApiProjectProject;
      "api::redirect.redirect": ApiRedirectRedirect;
      "api::sinco-project.sinco-project": ApiSincoProjectSincoProject;
      "api::zone.zone": ApiZoneZone;
      "plugin::content-releases.release": PluginContentReleasesRelease;
      "plugin::content-releases.release-action": PluginContentReleasesReleaseAction;
      "plugin::i18n.locale": PluginI18NLocale;
      "plugin::review-workflows.workflow": PluginReviewWorkflowsWorkflow;
      "plugin::review-workflows.workflow-stage": PluginReviewWorkflowsWorkflowStage;
      "plugin::upload.file": PluginUploadFile;
      "plugin::upload.folder": PluginUploadFolder;
      "plugin::users-permissions.permission": PluginUsersPermissionsPermission;
      "plugin::users-permissions.role": PluginUsersPermissionsRole;
      "plugin::users-permissions.user": PluginUsersPermissionsUser;
    }
  }
}
