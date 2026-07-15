import type { Schema, Struct } from "@strapi/strapi";

export interface ProyectoTipologia extends Struct.ComponentSchema {
  collectionName: "components_proyecto_tipologias";
  info: {
    description: "Tipolog\u00EDa de vivienda dentro de un proyecto";
    displayName: "Tipolog\u00EDa";
  };
  attributes: {
    areaM2: Schema.Attribute.Decimal;
    banos: Schema.Attribute.Integer;
    habitaciones: Schema.Attribute.Integer;
    nombre: Schema.Attribute.String & Schema.Attribute.Required;
    plano: Schema.Attribute.Media<"images" | "files">;
    precioCOP: Schema.Attribute.BigInteger;
  };
}

export interface SharedGeo extends Struct.ComponentSchema {
  collectionName: "components_shared_geos";
  info: {
    description: "Coordenadas y direcci\u00F3n";
    displayName: "Ubicaci\u00F3n";
  };
  attributes: {
    direccion: Schema.Attribute.String;
    lat: Schema.Attribute.Float;
    lng: Schema.Attribute.Float;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: "components_shared_seos";
  info: {
    description: "Metadatos para buscadores y redes";
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
      "proyecto.tipologia": ProyectoTipologia;
      "shared.geo": SharedGeo;
      "shared.seo": SharedSeo;
    }
  }
}
