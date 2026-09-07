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
  /** Calling code, with the plus, for the phone field. */
  dial: string;
  name: string;
}

/**
 * The flag as an emoji, built from the country code itself: each letter maps to
 * its regional indicator symbol. No sprite sheet, no 250 images to ship, and it
 * renders in the system font everywhere the site already runs.
 */
export function flagOf(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

const COMMON = ["US", "ES", "CA", "MX", "CL", "PA", "EC", "PE", "AR", "CR"];

const ALL: Country[] = [
  { code: "DE", dial: "+49", name: "Alemania" },
  { code: "AD", dial: "+376", name: "Andorra" },
  { code: "AO", dial: "+244", name: "Angola" },
  { code: "SA", dial: "+966", name: "Arabia Saudita" },
  { code: "AR", dial: "+54", name: "Argentina" },
  { code: "AU", dial: "+61", name: "Australia" },
  { code: "AT", dial: "+43", name: "Austria" },
  { code: "BE", dial: "+32", name: "Bélgica" },
  { code: "BZ", dial: "+501", name: "Belice" },
  { code: "BO", dial: "+591", name: "Bolivia" },
  { code: "BR", dial: "+55", name: "Brasil" },
  { code: "BG", dial: "+359", name: "Bulgaria" },
  { code: "CA", dial: "+1", name: "Canadá" },
  { code: "QA", dial: "+974", name: "Catar" },
  { code: "CZ", dial: "+420", name: "Chequia" },
  { code: "CL", dial: "+56", name: "Chile" },
  { code: "CN", dial: "+86", name: "China" },
  { code: "CY", dial: "+357", name: "Chipre" },
  { code: "VA", dial: "+39", name: "Ciudad del Vaticano" },
  { code: "CO", dial: "+57", name: "Colombia" },
  { code: "KR", dial: "+82", name: "Corea del Sur" },
  { code: "CR", dial: "+506", name: "Costa Rica" },
  { code: "HR", dial: "+385", name: "Croacia" },
  { code: "CU", dial: "+53", name: "Cuba" },
  { code: "DK", dial: "+45", name: "Dinamarca" },
  { code: "EC", dial: "+593", name: "Ecuador" },
  { code: "EG", dial: "+20", name: "Egipto" },
  { code: "SV", dial: "+503", name: "El Salvador" },
  { code: "AE", dial: "+971", name: "Emiratos Árabes Unidos" },
  { code: "SK", dial: "+421", name: "Eslovaquia" },
  { code: "SI", dial: "+386", name: "Eslovenia" },
  { code: "ES", dial: "+34", name: "España" },
  { code: "US", dial: "+1", name: "Estados Unidos" },
  { code: "EE", dial: "+372", name: "Estonia" },
  { code: "PH", dial: "+63", name: "Filipinas" },
  { code: "FI", dial: "+358", name: "Finlandia" },
  { code: "FR", dial: "+33", name: "Francia" },
  { code: "GR", dial: "+30", name: "Grecia" },
  { code: "GT", dial: "+502", name: "Guatemala" },
  { code: "GY", dial: "+592", name: "Guyana" },
  { code: "HT", dial: "+509", name: "Haití" },
  { code: "HN", dial: "+504", name: "Honduras" },
  { code: "HU", dial: "+36", name: "Hungría" },
  { code: "IN", dial: "+91", name: "India" },
  { code: "ID", dial: "+62", name: "Indonesia" },
  { code: "IE", dial: "+353", name: "Irlanda" },
  { code: "IS", dial: "+354", name: "Islandia" },
  { code: "IL", dial: "+972", name: "Israel" },
  { code: "IT", dial: "+39", name: "Italia" },
  { code: "JM", dial: "+1", name: "Jamaica" },
  { code: "JP", dial: "+81", name: "Japón" },
  { code: "LV", dial: "+371", name: "Letonia" },
  { code: "LT", dial: "+370", name: "Lituania" },
  { code: "LU", dial: "+352", name: "Luxemburgo" },
  { code: "MY", dial: "+60", name: "Malasia" },
  { code: "MT", dial: "+356", name: "Malta" },
  { code: "MA", dial: "+212", name: "Marruecos" },
  { code: "MX", dial: "+52", name: "México" },
  { code: "MC", dial: "+377", name: "Mónaco" },
  { code: "NI", dial: "+505", name: "Nicaragua" },
  { code: "NG", dial: "+234", name: "Nigeria" },
  { code: "NO", dial: "+47", name: "Noruega" },
  { code: "NZ", dial: "+64", name: "Nueva Zelanda" },
  { code: "NL", dial: "+31", name: "Países Bajos" },
  { code: "PA", dial: "+507", name: "Panamá" },
  { code: "PY", dial: "+595", name: "Paraguay" },
  { code: "PE", dial: "+51", name: "Perú" },
  { code: "PL", dial: "+48", name: "Polonia" },
  { code: "PT", dial: "+351", name: "Portugal" },
  { code: "GB", dial: "+44", name: "Reino Unido" },
  { code: "DO", dial: "+1", name: "República Dominicana" },
  { code: "RO", dial: "+40", name: "Rumanía" },
  { code: "RU", dial: "+7", name: "Rusia" },
  { code: "SG", dial: "+65", name: "Singapur" },
  { code: "ZA", dial: "+27", name: "Sudáfrica" },
  { code: "SE", dial: "+46", name: "Suecia" },
  { code: "CH", dial: "+41", name: "Suiza" },
  { code: "TH", dial: "+66", name: "Tailandia" },
  { code: "TT", dial: "+1", name: "Trinidad y Tobago" },
  { code: "TR", dial: "+90", name: "Turquía" },
  { code: "UA", dial: "+380", name: "Ucrania" },
  { code: "UY", dial: "+598", name: "Uruguay" },
  { code: "VE", dial: "+58", name: "Venezuela" },
  { code: "VN", dial: "+84", name: "Vietnam" },
];

const collator = new Intl.Collator("es");

/** The whole list, common destinations first, each block alphabetical. */
export const COUNTRIES: Country[] = [
  ...COMMON.map((code) => ALL.find((c) => c.code === code)!).filter(Boolean),
  ...ALL.filter((c) => !COMMON.includes(c.code)).sort((a, b) => collator.compare(a.name, b.name)),
];

/** How many of the above are the shortlist, so the list can rule them off. */
export const COMMON_COUNT = COMMON.length;
