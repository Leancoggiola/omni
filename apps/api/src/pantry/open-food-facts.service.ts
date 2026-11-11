import { z } from 'zod';

import { HttpError } from '../common/http';
import { config } from '../config';
import { buildCatalogProduct } from './open-food-facts.parser';
import type { CatalogProduct } from './open-food-facts.parser';

const REQUEST_TIMEOUT_MS = 5_000;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_REQUESTS_PER_USER = 8;
const PRODUCT_FIELDS = 'code,product_name,product_name_es,brands,quantity,categories_tags';

const UNAVAILABLE_MESSAGE = 'No se pudo consultar el catálogo de productos';
const TIMEOUT_MESSAGE = 'El catálogo de productos tardó demasiado en responder';
const BUSY_MESSAGE = 'Hay muchas consultas al catálogo de productos, probá de nuevo en un minuto';

let recentRequests: { at: number; userId: string }[] = [];

const productName = z.string().nullish();
const optionalText = z.string().nullish().catch(null);

const productResponseSchema = z.object({
  status: z.union([z.number(), z.string()]).nullish().catch(null),
  product: z
    .object({
      product_name: productName,
      product_name_es: productName,
      brands: optionalText,
      quantity: optionalText,
      categories_tags: z.array(z.string()).nullish().catch(null),
    })
    .nullish()
    .catch(null),
});

/**
 * Reserva una de las 10 consultas por minuto que la API se permite contra Open Food Facts, cuyo límite es de 15
 * lecturas de producto por minuto por IP. Una misma persona puede usar hasta 8, para que quien escanea muchos
 * códigos nuevos no deje sin catálogo al resto. Es una ventana deslizante en memoria: vale por instancia de la API.
 */
function reserveRequest(userId: string): boolean {
  const now = Date.now();
  recentRequests = recentRequests.filter(request => now - request.at < RATE_WINDOW_MS);
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) return false;
  if (recentRequests.filter(request => request.userId === userId).length >= MAX_REQUESTS_PER_USER) return false;
  recentRequests.push({ at: now, userId });
  return true;
}

/** Traduce una falla de red o de lectura del body al error HTTP que expone la API. */
function upstreamError(err: unknown): HttpError {
  if (err instanceof Error && err.name === 'TimeoutError') return new HttpError(504, TIMEOUT_MESSAGE);
  return new HttpError(502, UNAVAILABLE_MESSAGE);
}

/**
 * Busca un código de barras en Open Food Facts para la persona que lo escaneó. Devuelve `null` cuando el catálogo
 * no lo tiene (responde `status: 0`, con 404 o con 200) o lo tiene sin nombre, que para la alacena es lo mismo. Todo
 * lo demás es una falla y no un "no encontrado", para que no se guarde como tal: sin cupo o con 429 del proveedor
 * responde 503, si no contesta a tiempo 504 y ante cualquier otro error, un 404 que no trae `status: 0` (una URL mal
 * configurada, un cambio de ruta) o un body que no es el esperado, 502. La política de Open Food Facts exige un
 * `User-Agent` que identifique a la aplicación.
 */
export async function fetchProduct(barcode: string, userId: string): Promise<CatalogProduct | null> {
  if (!reserveRequest(userId)) throw new HttpError(503, BUSY_MESSAGE);

  let res: Response;
  try {
    res = await fetch(`${config.openFoodFacts.baseUrl}/product/${barcode}.json?fields=${PRODUCT_FIELDS}`, {
      headers: { 'User-Agent': config.openFoodFacts.userAgent, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw upstreamError(err);
  }

  if (res.status === 429) throw new HttpError(503, BUSY_MESSAGE);
  if (!res.ok && res.status !== 404) throw new HttpError(502, UNAVAILABLE_MESSAGE);

  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    throw upstreamError(err);
  }

  const parsed = productResponseSchema.safeParse(body);
  if (!parsed.success) throw new HttpError(502, UNAVAILABLE_MESSAGE);

  const { status, product } = parsed.data;
  if (status != null && String(status).trim() !== '' && Number(status) === 0) return null;
  if (res.status === 404 || !product) throw new HttpError(502, UNAVAILABLE_MESSAGE);

  return buildCatalogProduct({
    names: [product.product_name_es, product.product_name],
    brands: product.brands,
    quantity: product.quantity,
    categoriesTags: product.categories_tags,
  });
}

/** Solo para tests: la ventana de consultas es estado de módulo y sobrevive entre casos. */
export function resetOpenFoodFactsLimiter(): void {
  recentRequests = [];
}
