/**
 * Countries offered in the "País de residencia" field, in Spanish and sorted
 * the way a Spanish speaker reads them (so "Ñ" and accents land where they
 * belong, not where their code points do).
 *
 * The list leads with the markets the foreign-buyer page actually sells to —
 * where the Colombian diaspora is largest — and then covers the rest, so the
 * common answer is one keystroke away without hiding anyone else.
 */
export interface Country {
  /** ISO 3166-1 alpha-2, which is what the CRM will want the day it takes one. */
  code: string;
  name: string;
}

const COMMON = ["US", "ES", "CA", "MX", "CL", "PA", "EC", "PE", "AR", "CR"];

const ALL: Country[] = [
  { code: "DE", name: "Alemania" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "SA", name: "Arabia Saudita" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Bélgica" },
  { code: "BZ", name: "Belice" },
  { code: "BO", name: "Bolivia" },
  { code: "BR", name: "Brasil" },
  { code: "BG", name: "Bulgaria" },
  { code: "CA", name: "Canadá" },
  { code: "QA", name: "Catar" },
  { code: "CZ", name: "Chequia" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CY", name: "Chipre" },
  { code: "VA", name: "Ciudad del Vaticano" },
  { code: "CO", name: "Colombia" },
  { code: "KR", name: "Corea del Sur" },
  { code: "CR", name: "Costa Rica" },
  { code: "HR", name: "Croacia" },
  { code: "CU", name: "Cuba" },
  { code: "DK", name: "Dinamarca" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egipto" },
  { code: "SV", name: "El Salvador" },
  { code: "AE", name: "Emiratos Árabes Unidos" },
  { code: "SK", name: "Eslovaquia" },
  { code: "SI", name: "Eslovenia" },
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
  { code: "EE", name: "Estonia" },
  { code: "PH", name: "Filipinas" },
  { code: "FI", name: "Finlandia" },
  { code: "FR", name: "Francia" },
  { code: "GR", name: "Grecia" },
  { code: "GT", name: "Guatemala" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haití" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungría" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Irlanda" },
  { code: "IS", name: "Islandia" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italia" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japón" },
  { code: "LV", name: "Letonia" },
  { code: "LT", name: "Lituania" },
  { code: "LU", name: "Luxemburgo" },
  { code: "MY", name: "Malasia" },
  { code: "MT", name: "Malta" },
  { code: "MA", name: "Marruecos" },
  { code: "MX", name: "México" },
  { code: "MC", name: "Mónaco" },
  { code: "NI", name: "Nicaragua" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Noruega" },
  { code: "NZ", name: "Nueva Zelanda" },
  { code: "NL", name: "Países Bajos" },
  { code: "PA", name: "Panamá" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Perú" },
  { code: "PL", name: "Polonia" },
  { code: "PT", name: "Portugal" },
  { code: "GB", name: "Reino Unido" },
  { code: "DO", name: "República Dominicana" },
  { code: "RO", name: "Rumanía" },
  { code: "RU", name: "Rusia" },
  { code: "SG", name: "Singapur" },
  { code: "ZA", name: "Sudáfrica" },
  { code: "SE", name: "Suecia" },
  { code: "CH", name: "Suiza" },
  { code: "TH", name: "Tailandia" },
  { code: "TT", name: "Trinidad y Tobago" },
  { code: "TR", name: "Turquía" },
  { code: "UA", name: "Ucrania" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
];

const collator = new Intl.Collator("es");

/** The whole list, common destinations first, each block alphabetical. */
export const COUNTRIES: Country[] = [
  ...COMMON.map((code) => ALL.find((c) => c.code === code)!).filter(Boolean),
  ...ALL.filter((c) => !COMMON.includes(c.code)).sort((a, b) => collator.compare(a.name, b.name)),
];

/** How many of the above are the shortlist, so the list can rule them off. */
export const COMMON_COUNT = COMMON.length;
