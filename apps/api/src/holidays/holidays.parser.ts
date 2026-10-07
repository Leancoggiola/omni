/**
 * El feed `onthisday/holidays` de es.wikipedia mezcla efemérides civiles con el santoral completo
 * y con celebraciones de todos los países. Este módulo se queda solo con lo civil/temático
 * internacional más lo argentino. Las reglas salen de medir las 10.768 entradas del año.
 */

const NAME_CHAR = '[\\wÁÉÍÓÚÑÜáéíóúñü]';

/**
 * Un nombre repetido al inicio: "ChinaChina", "Argentina Argentina", "Imperio Romano Imperio romano".
 * Anclado y con mínimo 3 caracteres: sin eso, una doble letra ("Yennayer") se detecta como repetición.
 * El corte final va por lookahead y no por \b, porque en JS "ú" no cuenta como carácter de palabra.
 */
const ADJACENT_REPEAT = new RegExp(
  `^([A-ZÁÉÍÓÚÑÜ]${NAME_CHAR}{2,}(?:\\s+${NAME_CHAR}+){0,4})\\s?\\1(?!${NAME_CHAR})`,
  'i'
);

/** "Argentina Argentina: …", "ChinaChina China: …", "Andorra Andorra, España España y Gibraltar Gibraltar: …" */
const COUNTRY_PREFIX_WITH_COLON = /^([^:]{2,120}):\s*/;

const COUNTRY_FLAG = /^(?:\uD83C[\uDDE6-\uDDFF]){2}\s*/;
const ARGENTINA_FLAG = '🇦🇷';

/** Variante sin dos puntos: "México México Día Nacional del Cine Mexicano". */
const COUNTRY_PREFIX_BARE = new RegExp(`^([A-ZÁÉÍÓÚÑÜ]${NAME_CHAR}{2,}(?:\\s+${NAME_CHAR}+){0,3})\\s?\\1\\s+`);

/** Sub-prefijos argentinos: "Misiones: …", "Armada Argentina: …", "Provincia de Mendoza: …". */
const SUBREGION_PREFIX = /^([^:]{2,45}):\s*/;
const TITLE_START = /^(día|días|fiesta|aniversario|conmemoración|celebración|natalicio|jornada|semana|año)\b/i;

/** Santoral y fiestas litúrgicas. */
const RELIGIOUS =
  /^(san|santo|santa|santos|santas|beato|beata|beatos|beatas|santoral|nuestra\s+señora|señor\s+de|virgen|solemnidad|festividad|exaltación|memoria\s+de|fiesta\s+de\s+(san|santa|la\s+virgen)|conversión\s+de|presentación\s+del\s+señor|asunción|natividad|inmaculada|sagrado\s+coraz(ó|o)n|cristo|la\s+iglesia|las\s+iglesias|el\s+papa)\b/i;

/** Coletillas al final: ".(en inglés: X)", ".(imagen ilustrativa)", ":(Celebraciones relacionadas)". */
const TRAILING_NOTE = /[.:]\s*\([^)]*\)/g;

/** Corta el título en el primer punto seguido de mayúscula, con o sin espacio. */
const TITLE_SPLIT = /^(.+?)\.\s*(?=[A-ZÁÉÍÓÚÑÜ])/;

export interface ParsedHoliday {
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

function stripCountryPrefix(text: string): {
  rest: string;
  isArgentina: boolean;
  hadCountry: boolean;
} {
  const flagMatch = text.match(COUNTRY_FLAG);

  if (flagMatch) {
    const isArgentina = flagMatch[0].trim() === ARGENTINA_FLAG;
    const withoutFlag = text.slice(flagMatch[0].length).trim();

    // Bandera ajena: la entrada se descarta más arriba, no hace falta limpiar el prefijo.
    if (!isArgentina) return { rest: withoutFlag, isArgentina: false, hadCountry: true };

    return { rest: stripRepeatedPrefix(withoutFlag)?.rest ?? withoutFlag, isArgentina: true, hadCountry: true };
  }

  const stripped = stripRepeatedPrefix(text);
  if (!stripped) return { rest: text, isArgentina: false, hadCountry: false };

  return { rest: stripped.rest, isArgentina: /\bArgentina\b/.test(stripped.prefix), hadCountry: true };
}

/** Quita hasta dos sub-prefijos regionales para que "Santa Fe: Día X" no caiga en el filtro religioso. */
function stripSubregions(text: string): string {
  let rest = text;
  for (let i = 0; i < 2; i++) {
    const match = rest.match(SUBREGION_PREFIX);
    if (!match?.[1] || TITLE_START.test(match[1])) break;
    rest = rest.slice(match[0].length).trim();
  }
  return rest;
}

/** `null` cuando la entrada se descarta (país ajeno, religiosa o vacía). */
export function parseHolidayEntry(rawText: string): ParsedHoliday | null {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  const { rest, isArgentina, hadCountry } = stripCountryPrefix(normalized);
  if (hadCountry && !isArgentina) return null;

  const withoutSubregion = isArgentina ? stripSubregions(rest) : rest;
  if (!withoutSubregion || RELIGIOUS.test(withoutSubregion)) return null;

  const cleaned = withoutSubregion.replace(TRAILING_NOTE, '').trim();
  const split = cleaned.match(TITLE_SPLIT);
  const title = (split?.[1] ?? cleaned)
    .replace(/[.:]$/, '')
    .replace(/\([^)]*\)/g, '')
    .trim();
  if (!title) return null;

  return { title, isArgentina };
}
