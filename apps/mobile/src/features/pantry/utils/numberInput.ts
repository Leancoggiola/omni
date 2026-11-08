/** Texto de un campo numérico (admite coma decimal) → número; vacío queda vacío y lo ilegible es `NaN`. */
export function parseNumberInput(text: string): number | '' {
  const normalized = text.trim().replace(',', '.');
  return normalized === '' ? '' : Number(normalized);
}
