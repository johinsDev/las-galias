import type { Schema, Struct } from "@strapi/strapi";

export interface ProjectUnitType extends Struct.ComponentSchema {
  collectionName: "components_project_unit_types";
  info: {
    description: "Housing unit type within a project";
    displayName: "Unit type";
  };
  attributes: {
    areaM2: Schema.Attribute.Decimal;
    bathrooms: Schema.Attribute.Integer;
    bedrooms: Schema.Attribute.Integer;
    floorPlan: Schema.Attribute.Media<"images" | "files">;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    priceCOP: Schema.Attribute.BigInteger;
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
      "project.unit-type": ProjectUnitType;
      "shared.geo": SharedGeo;
      "shared.seo": SharedSeo;
    }
  }
}
