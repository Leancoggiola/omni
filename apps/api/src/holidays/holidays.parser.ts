/**
 * El feed `onthisday/holidays` de es.wikipedia mezcla efemérides civiles con el santoral, aniversarios locales,
 * rituales, notas sueltas y celebraciones de todos los países. Este módulo se queda solo con los "Día…"
 * internacionales y los argentinos que no son provinciales, más las excepciones de `isAllowedTitle`.
 * Las reglas salen de medir las entradas de todo el año.
 */

const NAME_CHAR = '[\\wÁÉÍÓÚÑÜáéíóúñü]';

/**
 * Primera palabra de un nombre de país, con artículo opcional: "El Salvador", "Los Países Bajos". El artículo
 * tiene dos letras, así que sin esto el mínimo de tres de la inicial dejaba pasar "El Salvador El Salvador".
 */
const NAME_START = `(?:(?:El|La|Los|Las)\\s+)?[A-ZÁÉÍÓÚÑÜ]${NAME_CHAR}{2,}`;

/**
 * Un nombre repetido al inicio: "ChinaChina", "Argentina Argentina", "Imperio Romano Imperio romano".
 * Anclado y con mínimo 3 caracteres: sin eso, una doble letra ("Yennayer") se detecta como repetición.
 * El corte final va por lookahead y no por \b, porque en JS "ú" no cuenta como carácter de palabra.
 */
const ADJACENT_REPEAT = new RegExp(`^(${NAME_START}(?:\\s+${NAME_CHAR}+){0,4})\\s?\\1(?!${NAME_CHAR})`, 'i');

const LISTED_COUNTRY = new RegExp(
  `,\\s*en:|(?:^[^:]*:.*?|(?<!${NAME_CHAR})en\\s+)(?<!${NAME_CHAR})([A-ZÁÉÍÓÚÑÜ]${NAME_CHAR}{2,}(?:\\s+${NAME_CHAR}+){0,4}?)\\s?\\1(?!${NAME_CHAR})`
);

/** "Argentina Argentina: …", "ChinaChina China: …", "Andorra Andorra, España España y Gibraltar Gibraltar: …" */
const COUNTRY_PREFIX_WITH_COLON = /^([^:]{2,120}):\s*/;

const COUNTRY_FLAG = /^(?:\uD83C[\uDDE6-\uDDFF]){2}\s*/;
const ARGENTINA_FLAG = '🇦🇷';

/** Variante sin dos puntos: "México México Día Nacional del Cine Mexicano". */
const COUNTRY_PREFIX_BARE = new RegExp(`^(${NAME_START}(?:\\s+${NAME_CHAR}+){0,3})\\s?\\1\\s+`);

const SUBREGION_PREFIX = /^([^:]{2,45}):\s*/;
const TITLE_START = /^(día|días|fiesta|aniversario|conmemoración|celebración|natalicio|jornada|semana|año)\b/i;

const PROVINCIAL_PREFIX = new RegExp(
  `^(?:por provincias|provincias? de|ciudad (?:autónoma )?de buenos aires|caba|buenos aires|catamarca|chaco|chubut|córdoba|corrientes|entre ríos|formosa|jujuy|la pampa|la rioja|mendoza|misiones|neuquén|río negro|salta|san juan|san luis|santa cruz|santa fe|santiago del estero|tierra del fuego|tucumán)(?!${NAME_CHAR})`,
  'i'
);

const DAY_TITLE = /^días?\s/i;
const WORLDWIDE_EXCEPTION = /^(año nuevo|navidad)$/i;
const ARGENTINE_EXCEPTION = /^(conmemoración (por|de) )?(la )?revolución de mayo$/i;

const UNLABELED_NATIONAL_DAY = /^días?\s+nacional(?!es)/i;
const WORLDWIDE_WORD = /\b(mundial|internacional|universal)\b/i;
const REGION = new RegExp(
  `(?<!${NAME_CHAR})(?:europ(?:a|e[oa]s?)|(?:pan|latino|inter|ibero|sud|sur|norte|centro|hispano)?am[eé]rica(?:n[oa]s?|s)?|(?:sud)?áfrica|african[oa]s?|mediterráneo|mercado común del sur)(?!${NAME_CHAR})`,
  'i'
);

/**
 * Prefijos supranacionales o globales que usa el feed para efemérides internacionales: se quitan
 * como un prefijo de país, pero la entrada se conserva. Salen del feed real, donde aparecen como
 * "Naciones Unidas: …", "Unión Europea Unión Europea: …" o "Naciones Unidas Día Mundial de los Océanos".
 * Los más largos van primero para que la alternancia no corte "Organización de las Naciones Unidas".
 */
const SUPRANATIONAL_NAMES = [
  'Organización de las Naciones Unidas',
  'Organización Mundial de la Salud',
  'Organización del Tratado del Atlántico Norte',
  'Naciones Unidas',
  'ONU',
  'UNESCO',
  'Unesco',
  'Unión Europea',
  'Mercosur',
  'Cruz Roja Internacional',
  'Mundialmente',
  'Mundial',
];

const REGIONAL_BLOCKS = ['Unión Europea', 'Mercosur'];

/** El nombre, opcionalmente repetido como en los países, seguido o no de dos puntos (grupo 2). */
const SUPRANATIONAL_PREFIX = new RegExp(`^(${SUPRANATIONAL_NAMES.join('|')})(?!${NAME_CHAR})(?:\\s?\\1)?(\\s*:)?\\s*`);

/**
 * Encabezado de agrupación del feed: "Disolución de Checoslovaquia:(Celebraciones relacionadas). Eslovaquia
 * Eslovaquia: …". El país que importa viene después; el encabezado solo, sin nada detrás, es un título.
 */
const RELATED_HEADER = /^[^:]{2,80}:\s*\(Celebraciones relacionadas\)\.\s*(?=\S)/i;

/**
 * Entrada con un país sin bandera ni nombre repetido: el feed deja un ":" suelto y luego "Niue: …". No aplica
 * si lo que sigue es un título ("Día …:").
 */
const LEADING_COLON_COUNTRY = /^:\s*([^:.]{2,60}):\s*\S/;

/** Coletillas al final: ".(en inglés: X)", ".(imagen ilustrativa)", ":(Celebraciones relacionadas)". */
const TRAILING_NOTE = /[.:]\s*\([^)]*\)/g;

/** Corta el título en el primer punto seguido de mayúscula, con o sin espacio. */
const TITLE_SPLIT = /^(.+?)\.\s*(?=[A-ZÁÉÍÓÚÑÜ])/;

interface ParsedHoliday {
  title: string;
  isArgentina: boolean;
}

/** Saca un prefijo de país con el nombre repetido (con dos puntos o sin ellos); `prefix` es solo el nombre. */
function stripRepeatedPrefix(text: string): { rest: string; prefix: string } | null {
  const withColon = text.match(COUNTRY_PREFIX_WITH_COLON);

  if (withColon?.[1] && ADJACENT_REPEAT.test(withColon[1])) {
    return { rest: text.slice(withColon[0].length).trim(), prefix: withColon[1] };
  }

  const bare = text.match(COUNTRY_PREFIX_BARE);

  if (bare?.[1]) {
    return { rest: text.slice(bare[0].length).trim(), prefix: bare[1] };
  }

  return null;
}

/**
 * `null` si el texto no arranca con un prefijo supranacional; si arranca, el texto sin él, marcando como regional al
 * de un bloque (Unión Europea, Mercosur). Sin dos puntos solo es prefijo si lo que sigue arranca como título:
 * "Mundial de Clubes" no lo es.
 */
function stripSupranationalPrefix(text: string): { rest: string; isRegional: boolean } | null {
  const match = text.match(SUPRANATIONAL_PREFIX);
  if (!match?.[1]) return null;

  const rest = text.slice(match[0].length).trim();
  if (!match[2] && !TITLE_START.test(rest)) return null;

  return { rest, isRegional: REGIONAL_BLOCKS.includes(match[1]) };
}

/**
 * Va después de los supranacionales, que pueden venir repetidos igual que un país. Con bandera ajena la entrada se
 * descarta más arriba, sin limpiar el prefijo.
 */
function stripCountryPrefix(text: string): {
  rest: string;
  isArgentina: boolean;
  hadCountry: boolean;
  isRegional: boolean;
} {
  const supranational = stripSupranationalPrefix(text);
  if (supranational) return { ...supranational, isArgentina: false, hadCountry: false };

  const base = { isArgentina: false, hadCountry: false, isRegional: false };
  const flagMatch = text.match(COUNTRY_FLAG);

  if (flagMatch) {
    const isArgentina = flagMatch[0].trim() === ARGENTINA_FLAG;
    const withoutFlag = text.slice(flagMatch[0].length).trim();
    const rest = isArgentina ? (stripRepeatedPrefix(withoutFlag)?.rest ?? withoutFlag) : withoutFlag;

    return { ...base, rest, isArgentina, hadCountry: true };
  }

  const stripped = stripRepeatedPrefix(text);
  if (!stripped) return { ...base, rest: text };

  return { ...base, rest: stripped.rest, isArgentina: /\bArgentina\b/.test(stripped.prefix), hadCountry: true };
}

/**
 * Quita hasta dos sub-prefijos de instituciones argentinas ("Armada Argentina: …"). `null` si alguno es una
 * provincia, CABA o el bloque "Por provincias": esas efemérides son locales.
 */
function stripArgentineSubprefixes(text: string): string | null {
  let rest = text;
  for (let i = 0; i < 2; i++) {
    const match = rest.match(SUBREGION_PREFIX);
    if (!match?.[1] || TITLE_START.test(match[1])) break;
    if (PROVINCIAL_PREFIX.test(match[1])) return null;
    rest = rest.slice(match[0].length).trim();
  }
  return rest;
}

/**
 * Un "Día…" sin país que igual no es mundial: enumera países, es un "Día Nacional…" de otro país que el feed no rotula
 * (casi siempre de Estados Unidos), o es de una región (por el título o por el bloque que lo rotula) y no se declara
 * mundial ni internacional. Los países enumerados se reconocen por ", en:" o por un nombre repetido después de dos
 * puntos o pegado a "en" ("en Chad Chad"); sin ese ancla, un nombre de persona ("José José") pasaba por país.
 */
function isLimitedScope(title: string, isRegional: boolean): boolean {
  if (LISTED_COUNTRY.test(title) || UNLABELED_NATIONAL_DAY.test(title)) return true;

  return (isRegional || REGION.test(title)) && !WORLDWIDE_WORD.test(title);
}

/**
 * Lista blanca sobre el título ya limpio: los "Día…" más "Año Nuevo", "Navidad" y, solo si es argentina, la
 * Revolución de Mayo. Un prefijo que no se reconoció queda al principio del título y por eso lo descarta.
 */
function isAllowedHoliday({ title, isArgentina }: ParsedHoliday, isRegional: boolean): boolean {
  if (WORLDWIDE_EXCEPTION.test(title)) return true;
  if (isArgentina) return DAY_TITLE.test(title) || ARGENTINE_EXCEPTION.test(title);

  return DAY_TITLE.test(title) && !isLimitedScope(title, isRegional);
}

/**
 * `null` cuando la entrada se descarta (país ajeno, provincial, vacía o fuera de la lista blanca). Un paréntesis
 * inicial ya quitado deja sus dos puntos: "(ciertas regiones): Día del Mediterráneo".
 */
export function parseHolidayEntry(rawText: string): ParsedHoliday | null {
  const flattened = rawText.replace(/\s+/g, ' ').trim();

  const leadingCountry = flattened.match(LEADING_COLON_COUNTRY)?.[1];
  if (
    leadingCountry &&
    !TITLE_START.test(leadingCountry) &&
    stripSupranationalPrefix(`${leadingCountry}: x`) === null
  ) {
    return null;
  }

  const normalized = flattened.replace(RELATED_HEADER, '').replace(/^[:\s]+/, '');
  if (!normalized) return null;

  const { rest, isArgentina, hadCountry, isRegional } = stripCountryPrefix(normalized);
  if (hadCountry && !isArgentina) return null;

  const withoutSubprefix = isArgentina ? stripArgentineSubprefixes(rest) : rest;
  if (!withoutSubprefix) return null;

  const cleaned = withoutSubprefix.replace(TRAILING_NOTE, '').trim();
  const split = cleaned.match(TITLE_SPLIT);
  const title = (split?.[1] ?? cleaned)
    .replace(/[.:]$/, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/^[:\s]+/, '')
    .trim();
  const holiday = { title, isArgentina };

  return isAllowedHoliday(holiday, isRegional) ? holiday : null;
}
