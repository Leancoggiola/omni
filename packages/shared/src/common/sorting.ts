const NAME_COLLATOR = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/**
 * Orden alfabético de nombres y títulos para `sort`: reglas del español (la ñ va después de la n), sin distinguir
 * mayúsculas ni tildes y con los números en orden natural (2 antes que 10). La comparación es literal: los artículos
 * cuentan. Da 0 entre nombres equivalentes, así que `sort` conserva entre ellos el orden de entrada.
 */
export function compareNames(a: string, b: string): number {
  return NAME_COLLATOR.compare(a, b);
}
