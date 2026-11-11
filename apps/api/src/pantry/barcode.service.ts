import { parseIsoDateString } from '@omni/shared/common';
import { isInternalBarcode } from '@omni/shared/pantry';
import type {
  PantryBarcodeLookup,
  PantryBarcodeSuggestion,
  PantryScanResult,
  ParsedScanPantryProduct,
} from '@omni/shared/pantry';

import { prisma } from '../common/db';
import { HttpError } from '../common/http';
import { logger } from '../common/utils';
import { normalizeName } from '../common/utils/lifestyle';
import type { BarcodeCatalogEntry } from '../generated/prisma/client';
import { getHouseholdId, withHousehold } from '../household/household.service';
import { composeProductName } from './open-food-facts.parser';
import type { CatalogProduct } from './open-food-facts.parser';
import { fetchProduct } from './open-food-facts.service';
import { applyStockDelta, mapProduct } from './pantry.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const FOUND_TTL_MS = 30 * DAY_MS;
const NOT_FOUND_TTL_MS = 7 * DAY_MS;
const STALE_BACKOFF_MS = 60 * 60 * 1000;
const SOURCE_BASE_URL = 'https://world.openfoodfacts.org/product';

const inFlight = new Map<string, Promise<CatalogProduct | null>>();

/**
 * Corta los códigos de uso interno de un comercio (balanza, fiambrería, panadería): cada local los arma a su manera,
 * no identifican un producto y no están en ningún catálogo, así que ni se buscan ni se vinculan.
 */
function assertCatalogBarcode(barcode: string): void {
  if (isInternalBarcode(barcode)) {
    throw new HttpError(400, 'Ese código es interno del comercio y no identifica un producto: cargalo a mano');
  }
}

/** Producto de catálogo guardado en una fila del caché; `null` si la fila registra que el código no existe. */
function fromEntry(entry: BarcodeCatalogEntry): CatalogProduct | null {
  if (!entry.found || !entry.name) return null;
  return { name: entry.name, brand: entry.brand, packageSize: entry.packageSize, category: entry.category };
}

/**
 * Guarda en el caché compartido lo que respondió el catálogo: 30 días si el código existe y 7 si no, para que un
 * producto recién cargado en Open Food Facts aparezca sin esperar un mes. Antes de guardar un "no existe" barre los
 * que ya vencieron, así el caché no crece con códigos que nadie volvió a consultar. El caché es una optimización: si
 * la escritura falla (por ejemplo, dos consultas simultáneas al mismo código en instancias distintas) solo se
 * registra.
 */
async function saveCatalogEntry(barcode: string, product: CatalogProduct | null): Promise<void> {
  const fetchedAt = new Date();
  const data = {
    found: product !== null,
    name: product?.name ?? null,
    brand: product?.brand ?? null,
    packageSize: product?.packageSize ?? null,
    category: product?.category ?? null,
    fetchedAt,
    expiresAt: new Date(fetchedAt.getTime() + (product ? FOUND_TTL_MS : NOT_FOUND_TTL_MS)),
  };
  try {
    if (!product) {
      await prisma.barcodeCatalogEntry.deleteMany({ where: { found: false, expiresAt: { lt: fetchedAt } } });
    }
    await prisma.barcodeCatalogEntry.upsert({ where: { barcode }, create: { barcode, ...data }, update: data });
  } catch (err) {
    logger.warn({ err }, 'No se pudo guardar el código de barras en el caché del catálogo');
  }
}

/**
 * Corre una hora el vencimiento de una fila que se sirvió vencida porque el catálogo falló: mientras siga caído, las
 * próximas consultas de ese código salen del caché sin esperar el tope de tiempo ni gastar cupo.
 */
async function postponeRefresh(barcode: string): Promise<void> {
  try {
    await prisma.barcodeCatalogEntry.updateMany({
      where: { barcode },
      data: { expiresAt: new Date(Date.now() + STALE_BACKOFF_MS) },
    });
  } catch (err) {
    logger.warn({ err }, 'No se pudo postergar la actualización del código de barras en el caché');
  }
}

/**
 * Consulta Open Food Facts y actualiza el caché. Una falla del proveedor no se guarda: se propaga para que el cliente
 * ofrezca la carga a mano, salvo que haya una fila vencida con el producto, que se sigue sirviendo una hora más
 * porque un producto de góndola no cambia de un mes a otro.
 */
async function refreshCatalogEntry(barcode: string, previous: BarcodeCatalogEntry | null, userId: string) {
  let product: CatalogProduct | null;
  try {
    product = await fetchProduct(barcode, userId);
  } catch (err) {
    const stale = previous ? fromEntry(previous) : null;
    if (!stale) throw err;
    logger.warn({ err }, 'Open Food Facts falló: se devuelve el producto guardado en el caché');
    await postponeRefresh(barcode);
    return stale;
  }
  await saveCatalogEntry(barcode, product);
  return product;
}

/**
 * Producto de catálogo de un código, desde el caché en base (compartido entre hogares e instancias) o, si no está o
 * venció, desde Open Food Facts. Las consultas simultáneas al mismo código dentro de la instancia comparten una sola
 * salida a la red.
 */
async function resolveCatalogProduct(barcode: string, userId: string): Promise<CatalogProduct | null> {
  const cached = await prisma.barcodeCatalogEntry.findUnique({ where: { barcode } });
  if (cached && cached.expiresAt > new Date()) return fromEntry(cached);

  const pending = inFlight.get(barcode);
  if (pending) return pending;

  const promise = refreshCatalogEntry(barcode, cached, userId).finally(() => {
    inFlight.delete(barcode);
  });
  inFlight.set(barcode, promise);
  return promise;
}

/** Sugerencia para precargar el formulario de alta, con el link a la ficha que exige la licencia de los datos. */
function toSuggestion(barcode: string, product: CatalogProduct): PantryBarcodeSuggestion {
  return {
    name: composeProductName(product.name, product.brand, product.packageSize),
    brand: product.brand,
    packageSize: product.packageSize,
    category: product.category,
    unit: 'PACKAGES',
    sourceUrl: `${SOURCE_BASE_URL}/${barcode}`,
  };
}

/**
 * Resuelve un código escaneado. Primero mira la alacena del hogar: si algún producto ya lo tiene vinculado responde
 * `IN_PANTRY` sin salir a la red, que es el caso de todos los días. Si no, busca en el catálogo y responde `FOUND`
 * con una sugerencia para el formulario o `NOT_FOUND` para cargarlo a mano.
 */
export async function lookupBarcode(userId: string, barcode: string): Promise<PantryBarcodeLookup> {
  assertCatalogBarcode(barcode);

  const householdId = await getHouseholdId(userId);
  const product = await prisma.pantryProduct.findUnique({
    where: { householdId_barcode: { householdId, barcode } },
  });
  if (product) return { status: 'IN_PANTRY', barcode, product: mapProduct(product) };

  const catalogProduct = await resolveCatalogProduct(barcode, userId);
  if (!catalogProduct) return { status: 'NOT_FOUND', barcode };
  return { status: 'FOUND', barcode, suggestion: toSuggestion(barcode, catalogProduct) };
}

/**
 * Registra un escaneo con el hogar bloqueado, así dos escaneos simultáneos del mismo código nunca crean dos
 * productos. Si el código ya está vinculado suma `quantity` a ese producto (`INCREMENTED`) y no necesita más datos.
 * Si no, hacen falta los del formulario: cuando ya hay un producto con ese nombre se le suma el stock sin tocar su
 * categoría, unidad ni vencimiento, y se le vincula el código si no tenía ninguno (`LINKED`; con otro código ya
 * vinculado solo suma, `INCREMENTED`); cuando no lo hay, se da de alta con el código (`CREATED`). Un código que no
 * está en la alacena y llega sin datos responde 404: el producto se desvinculó o se borró después de la consulta.
 */
export async function scanProduct(userId: string, dto: ParsedScanPantryProduct): Promise<PantryScanResult> {
  assertCatalogBarcode(dto.barcode);

  return withHousehold(userId, async (tx, householdId) => {
    const byBarcode = await tx.pantryProduct.findUnique({
      where: { householdId_barcode: { householdId, barcode: dto.barcode } },
    });
    if (byBarcode) {
      const product = await applyStockDelta(tx, userId, byBarcode, dto.quantity);
      return { outcome: 'INCREMENTED', product: mapProduct(product) };
    }

    if (!dto.product) {
      throw new HttpError(404, 'Ese código no está en tu alacena: completá los datos del producto');
    }

    const nameNormalized = normalizeName(dto.product.name);
    const byName = await tx.pantryProduct.findUnique({
      where: { householdId_nameNormalized: { householdId, nameNormalized } },
    });
    if (byName) {
      const links = byName.barcode === null;
      const product = await applyStockDelta(tx, userId, byName, dto.quantity, links ? { barcode: dto.barcode } : {});
      return { outcome: links ? 'LINKED' : 'INCREMENTED', product: mapProduct(product) };
    }

    const product = await tx.pantryProduct.create({
      data: {
        householdId,
        createdById: userId,
        updatedById: userId,
        name: dto.product.name.trim(),
        nameNormalized,
        category: dto.product.category,
        unit: dto.product.unit,
        quantity: dto.quantity,
        minQuantity: dto.product.minQuantity ?? null,
        expiresAt: dto.product.expiresAt ? parseIsoDateString(dto.product.expiresAt) : null,
        barcode: dto.barcode,
      },
    });
    return { outcome: 'CREATED', product: mapProduct(product) };
  });
}
