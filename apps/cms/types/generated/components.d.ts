import type { Schema, Struct } from "@strapi/strapi";

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
      "page.step": PageStep;
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
