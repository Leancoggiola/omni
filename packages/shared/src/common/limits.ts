import { z } from 'zod';

/** Los ids son cuid (25 caracteres): el tope deja margen sin dejar pasar strings arbitrarios a la base. */
export const ID_MAX_LENGTH = 64;

/** Largo máximo de un texto de búsqueda (TMDB, despensa, amigos). */
export const SEARCH_QUERY_MAX_LENGTH = 200;

/** Largo máximo de un token que llega del cliente: un JWT firmado con claims mínimos ronda los 300 caracteres. */
export const TOKEN_MAX_LENGTH = 2048;

/** Tope de participantes de una juntada. */
export const GATHERING_PARTICIPANTS_MAX = 50;

/** Máximo de cada `Decimal(precisión, 2)` de Postgres: `Decimal(12,2)` admite hasta 10 dígitos enteros, etc. */
export const AMOUNT_MAX_12_2 = 9_999_999_999.99;
export const AMOUNT_MAX_10_2 = 99_999_999.99;
export const AMOUNT_MAX_8_2 = 999_999.99;

/** Id de un recurso: un string no vacío y acotado. */
export const idSchema = z.string().min(1).max(ID_MAX_LENGTH);

/** Schema para `validate(…, 'params')` con los parámetros de ruta indicados (`:id`, `:gatheringId`, etc.). */
export function idParamsSchema<const Name extends string>(...names: [Name, ...Name[]]) {
  return z.object(Object.fromEntries(names.map(name => [name, idSchema])) as Record<Name, typeof idSchema>);
}
