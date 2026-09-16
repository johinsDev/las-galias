/**
 * Countries offered in the "País de residencia" field and the phone field's
 * calling code, in Spanish and sorted the way a Spanish speaker reads them (so
 * "Ñ" and accents land where they belong, not where their code points do).
 *
 * The list is grouped by region, nearest first: Colombia on its own at the top,
 * then the rest of Latin America, North America and Europe — where the
 * Colombian diaspora is largest — and everyone else last, so the likely answer
 * is at the top without hiding anyone.
 */
export interface Country {
  /** ISO 3166-1 alpha-2, which is what the CRM will want the day it takes one. */
  code: string;
  /** Calling code, with the plus, for the phone field. */
  dial: string;
  /**
   * How many digits the national number has, where we are confident. Absent
   * means "we do not know", and the field falls back to E.164's own ceiling
   * rather than inventing a rule and rejecting a valid number.
   */
  nsn?: number;
  name: string;
}

/** Digits allowed after the calling code. E.164 caps the whole thing at 15. */
export function nationalMax(country: Country): number {
  return country.nsn ?? 15 - (country.dial.length - 1);
}

/**
 * How the national number is grouped for reading, derived from its length so
 * there is no per-country pattern to maintain: 10 digits read 3-3-4 (Colombia's
 * 300 123 4567), 9 read 3-3-3, and anything unknown falls back to threes.
 */
export function groupsFor(length: number): number[] {
  switch (length) {
    case 11:
      return [3, 4, 4];
    case 10:
      return [3, 3, 4];
    case 9:
      return [3, 3, 3];
    case 8:
      return [4, 4];
    case 7:
      return [3, 4];
    default:
      return [];
  }
}

/**
 * The flag as an emoji, built from the country code itself: each letter maps to
 * its regional indicator symbol. No sprite sheet, no 250 images to ship, and it
 * renders in the system font everywhere the site already runs.
 */
export function flagOf(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

const ALL: Country[] = [
  { code: "DE", dial: "+49", nsn: 11, name: "Alemania" },
  { code: "AD", dial: "+376", name: "Andorra" },
  { code: "AO", dial: "+244", name: "Angola" },
  { code: "SA", dial: "+966", nsn: 9, name: "Arabia Saudita" },
  { code: "AR", dial: "+54", nsn: 10, name: "Argentina" },
  { code: "AU", dial: "+61", nsn: 9, name: "Australia" },
  { code: "AT", dial: "+43", nsn: 11, name: "Austria" },
  { code: "BE", dial: "+32", nsn: 9, name: "Bélgica" },
  { code: "BZ", dial: "+501", name: "Belice" },
  { code: "BO", dial: "+591", nsn: 8, name: "Bolivia" },
  { code: "BR", dial: "+55", nsn: 11, name: "Brasil" },
  { code: "BG", dial: "+359", name: "Bulgaria" },
  { code: "CA", dial: "+1", nsn: 10, name: "Canadá" },
  { code: "QA", dial: "+974", name: "Catar" },
  { code: "CZ", dial: "+420", nsn: 9, name: "Chequia" },
  { code: "CL", dial: "+56", nsn: 9, name: "Chile" },
  { code: "CN", dial: "+86", nsn: 11, name: "China" },
  { code: "CY", dial: "+357", name: "Chipre" },
  { code: "VA", dial: "+39", name: "Ciudad del Vaticano" },
  { code: "CO", dial: "+57", nsn: 10, name: "Colombia" },
  { code: "KR", dial: "+82", name: "Corea del Sur" },
  { code: "CR", dial: "+506", nsn: 8, name: "Costa Rica" },
  { code: "HR", dial: "+385", name: "Croacia" },
  { code: "CU", dial: "+53", nsn: 8, name: "Cuba" },
  { code: "DK", dial: "+45", nsn: 8, name: "Dinamarca" },
  { code: "EC", dial: "+593", nsn: 9, name: "Ecuador" },
  { code: "EG", dial: "+20", name: "Egipto" },
  { code: "SV", dial: "+503", nsn: 8, name: "El Salvador" },
  { code: "AE", dial: "+971", nsn: 9, name: "Emiratos Árabes Unidos" },
  { code: "SK", dial: "+421", name: "Eslovaquia" },
  { code: "SI", dial: "+386", name: "Eslovenia" },
  { code: "ES", dial: "+34", nsn: 9, name: "España" },
  { code: "US", dial: "+1", nsn: 10, name: "Estados Unidos" },
  { code: "EE", dial: "+372", name: "Estonia" },
  { code: "PH", dial: "+63", name: "Filipinas" },
  { code: "FI", dial: "+358", nsn: 10, name: "Finlandia" },
  { code: "FR", dial: "+33", nsn: 9, name: "Francia" },
  { code: "GR", dial: "+30", name: "Grecia" },
  { code: "GT", dial: "+502", nsn: 8, name: "Guatemala" },
  { code: "GY", dial: "+592", name: "Guyana" },
  { code: "HT", dial: "+509", name: "Haití" },
  { code: "HN", dial: "+504", nsn: 8, name: "Honduras" },
  { code: "HU", dial: "+36", name: "Hungría" },
  { code: "IN", dial: "+91", nsn: 10, name: "India" },
  { code: "ID", dial: "+62", name: "Indonesia" },
  { code: "IE", dial: "+353", nsn: 9, name: "Irlanda" },
  { code: "IS", dial: "+354", name: "Islandia" },
  { code: "IL", dial: "+972", nsn: 9, name: "Israel" },
  { code: "IT", dial: "+39", nsn: 10, name: "Italia" },
  { code: "JM", dial: "+1", nsn: 10, name: "Jamaica" },
  { code: "JP", dial: "+81", nsn: 10, name: "Japón" },
  { code: "LV", dial: "+371", name: "Letonia" },
  { code: "LT", dial: "+370", name: "Lituania" },
  { code: "LU", dial: "+352", name: "Luxemburgo" },
  { code: "MY", dial: "+60", name: "Malasia" },
  { code: "MT", dial: "+356", name: "Malta" },
  { code: "MA", dial: "+212", name: "Marruecos" },
  { code: "MX", dial: "+52", nsn: 10, name: "México" },
  { code: "MC", dial: "+377", name: "Mónaco" },
  { code: "NI", dial: "+505", nsn: 8, name: "Nicaragua" },
  { code: "NG", dial: "+234", name: "Nigeria" },
  { code: "NO", dial: "+47", nsn: 8, name: "Noruega" },
  { code: "NZ", dial: "+64", nsn: 9, name: "Nueva Zelanda" },
  { code: "NL", dial: "+31", nsn: 9, name: "Países Bajos" },
  { code: "PA", dial: "+507", nsn: 8, name: "Panamá" },
  { code: "PY", dial: "+595", nsn: 9, name: "Paraguay" },
  { code: "PE", dial: "+51", nsn: 9, name: "Perú" },
  { code: "PL", dial: "+48", nsn: 9, name: "Polonia" },
  { code: "PT", dial: "+351", nsn: 9, name: "Portugal" },
  { code: "GB", dial: "+44", nsn: 10, name: "Reino Unido" },
  { code: "DO", dial: "+1", nsn: 10, name: "República Dominicana" },
  { code: "RO", dial: "+40", name: "Rumanía" },
  { code: "RU", dial: "+7", name: "Rusia" },
  { code: "SG", dial: "+65", name: "Singapur" },
  { code: "ZA", dial: "+27", name: "Sudáfrica" },
  { code: "SE", dial: "+46", nsn: 9, name: "Suecia" },
  { code: "CH", dial: "+41", nsn: 9, name: "Suiza" },
  { code: "TH", dial: "+66", name: "Tailandia" },
  { code: "TT", dial: "+1", nsn: 10, name: "Trinidad y Tobago" },
  { code: "TR", dial: "+90", name: "Turquía" },
  { code: "UA", dial: "+380", name: "Ucrania" },
  { code: "UY", dial: "+598", nsn: 8, name: "Uruguay" },
  { code: "VE", dial: "+58", nsn: 10, name: "Venezuela" },
  { code: "VN", dial: "+84", name: "Vietnam" },
];

const collator = new Intl.Collator("es");

/**
 * Regions in display order, as space-separated ISO codes. `lead` goes first in
 * its group regardless of the alphabet (the biggest market of each); the rest
 * follow alphabetically. The last region has no list: it takes every country
 * the others did not claim, so adding a country to `ALL` can never make it
 * vanish from the picker.
 */
const REGIONS: { label?: string; lead?: string; codes?: string }[] = [
  // No heading: a group of one called "Colombia" would only repeat the name.
  { lead: "CO", codes: "" },
  { label: "Sudamérica", codes: "AR BO BR CL EC GY PY PE UY VE" },
  { label: "Centroamérica y el Caribe", codes: "BZ CR CU SV GT HT HN JM NI PA DO TT" },
  { label: "Norteamérica", lead: "US", codes: "CA MX" },
  {
    label: "Europa",
    lead: "ES",
    codes:
      "DE AD AT BE BG CZ CY VA HR DK SK SI EE FI FR GR HU IE IS IT LV LT LU MT MC NO NL PL PT GB RO RU SE CH UA",
  },
  { label: "Resto del mundo" },
];

export interface CountryGroup {
  /** Heading shown above the group; absent for Colombia, which needs none. */
  label?: string;
  items: Country[];
}

const byName = (a: Country, b: Country) => collator.compare(a.name, b.name);
const codesOf = (list = "") => list.split(" ").filter(Boolean);
const claimed = new Set(REGIONS.flatMap((r) => [...codesOf(r.lead), ...codesOf(r.codes)]));

/** The list as the pickers show it: by region, most likely first. */
export const COUNTRY_GROUPS: CountryGroup[] = REGIONS.map(({ label, lead, codes }) => {
  const leading = codesOf(lead);
  const members = codes === undefined ? null : codesOf(codes);
  return {
    label,
    items: [
      ...ALL.filter((c) => leading.includes(c.code)),
      ...ALL.filter(
        (c) =>
          !leading.includes(c.code) && (members ? members.includes(c.code) : !claimed.has(c.code)),
      ).sort(byName),
    ],
  };
});

/** The same list, flat. */
export const COUNTRIES: Country[] = COUNTRY_GROUPS.flatMap((group) => group.items);
