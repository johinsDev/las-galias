import type { Schema, Struct } from "@strapi/strapi";

export interface PageIllustratedStep extends Struct.ComponentSchema {
  collectionName: "components_page_illustrated_steps";
  info: {
    description: "Paso de un \u00ABc\u00F3mo funciona\u00BB que s\u00ED lleva imagen. El n\u00FAmero es la posici\u00F3n, no un campo. Se diferencia de \u00ABStep\u00BB en la foto: el home la muestra y la p\u00E1gina de exterior no";
    displayName: "Paso con foto";
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    image: Schema.Attribute.Media<"images">;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageListItem extends Struct.ComponentSchema {
  collectionName: "components_page_list_items";
  info: {
    description: "Una l\u00EDnea suelta (badge, vi\u00F1eta). Existe para no usar un campo JSON: el editor de JSON del admin rompe la pantalla y adem\u00E1s obliga al editor a escribir sintaxis";
    displayName: "\u00CDtem de lista";
  };
  attributes: {
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageStat extends Struct.ComponentSchema {
  collectionName: "components_page_stats";
  info: {
    description: "Una cifra de la banda de indicadores: el n\u00FAmero grande y su etiqueta";
    displayName: "Cifra";
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageStep extends Struct.ComponentSchema {
  collectionName: "components_page_steps";
  info: {
    description: "Numbered step in a 'how it works' block; the number is the position, not a field";
    displayName: "Step";
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageToolCard extends Struct.ComponentSchema {
  collectionName: "components_page_tool_cards";
  info: {
    description: "Atajo a un simulador desde el home. El icono es una clave, no un archivo, para que no dependa de que alguien suba un SVG con el trazo correcto";
    displayName: "Tarjeta de herramienta";
  };
  attributes: {
    body: Schema.Attribute.Text;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    iconKey: Schema.Attribute.Enumeration<["credit-card", "subsidy", "calculator", "wallet"]> &
      Schema.Attribute.DefaultTo<"credit-card">;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ProjectConstructionProgress extends Struct.ComponentSchema {
  collectionName: "components_project_construction_progress";
  info: {
    description: "One entry per month; the PDP renders them as tabs, each with its own independent video";
    displayName: "Construction progress";
  };
  attributes: {
    date: Schema.Attribute.Date;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    video: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ProjectFinancing extends Struct.ComponentSchema {
  collectionName: "components_project_financings";
  info: {
    description: "Feeds the PDP sticky sidebar: instalment breakdown, trust details and the payments portal. Overrides the global calculator-config for this project";
    displayName: "Financing";
  };
  attributes: {
    annualRatePct: Schema.Attribute.Decimal;
    builderInstallmentMonths: Schema.Attribute.Integer;
    clientPortalUrl: Schema.Attribute.String;
    downPaymentPct: Schema.Attribute.Integer;
    termYears: Schema.Attribute.Integer;
    trusteeName: Schema.Attribute.String;
    trustNumber: Schema.Attribute.String;
  };
}

export interface ProjectSalesRoom extends Struct.ComponentSchema {
  collectionName: "components_project_sales_rooms";
  info: {
    description: "Shown under the map on the PDP. The street address lives in the project's location (shared.geo), not here";
    displayName: "Sales room";
  };
  attributes: {
    email: Schema.Attribute.Email;
    phone: Schema.Attribute.String;
    schedule: Schema.Attribute.String;
    whatsappUrl: Schema.Attribute.String;
  };
}

export interface ProjectSpecSheet extends Struct.ComponentSchema {
  collectionName: "components_project_spec_sheets";
  info: {
    description: "Project-level technical data for the PDP grid. Per-unit figures (area, bedrooms, bathrooms) live in unit-type, not here";
    displayName: "Spec sheet";
  };
  attributes: {
    apartments: Schema.Attribute.Integer;
    deliveryYear: Schema.Attribute.Integer;
    elevatorsPerTower: Schema.Attribute.Integer;
    parking: Schema.Attribute.String;
    stratum: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
          min: 1;
        },
        number
      >;
    towers: Schema.Attribute.Integer;
  };
}

export interface ProjectUnitType extends Struct.ComponentSchema {
  collectionName: "components_project_unit_types";
  info: {
    description: "Housing unit type within a project";
    displayName: "Unit type";
  };
  attributes: {
    bathrooms: Schema.Attribute.Integer;
    bedrooms: Schema.Attribute.Integer;
    builtAreaM2: Schema.Attribute.Decimal;
    floorPlan: Schema.Attribute.Media<"images" | "files">;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    priceCOP: Schema.Attribute.BigInteger;
    privateAreaM2: Schema.Attribute.Decimal;
  };
}

export interface SharedGeo extends Struct.ComponentSchema {
  collectionName: "components_shared_geos";
  info: {
    description: "Coordinates and address";
    displayName: "Location";
  };
  attributes: {
    address: Schema.Attribute.String;
    lat: Schema.Attribute.Float;
    lng: Schema.Attribute.Float;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: "components_shared_seos";
  info: {
    description: "Search engine and social metadata";
    displayName: "SEO";
  };
  attributes: {
    metaDescription: Schema.Attribute.Text;
    metaTitle: Schema.Attribute.String;
    ogImage: Schema.Attribute.Media<"images">;
  };
}

declare module "@strapi/strapi" {
  export namespace Public {
    export interface ComponentSchemas {
      "page.illustrated-step": PageIllustratedStep;
      "page.list-item": PageListItem;
      "page.stat": PageStat;
      "page.step": PageStep;
      "page.tool-card": PageToolCard;
      "project.construction-progress": ProjectConstructionProgress;
      "project.financing": ProjectFinancing;
      "project.sales-room": ProjectSalesRoom;
      "project.spec-sheet": ProjectSpecSheet;
      "project.unit-type": ProjectUnitType;
      "shared.geo": SharedGeo;
      "shared.seo": SharedSeo;
    }
  }
}
