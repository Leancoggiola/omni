import type {
  AddShoppingListItemPayload,
  CompleteShoppingListItemPayload,
  CreatePantryProductPayload,
  ListPantryProductsParams,
  PantryProduct,
  PantryShoppingListItem,
  PantrySummary,
  SuggestPantryProductsParams,
  UpdatePantryProductPayload,
} from '@omni/shared/pantry';
import { isExpiringSoon, isLowStock } from '@omni/shared/pantry';
import { parseIsoDateString, startOfTodayInAppTz } from '@omni/shared/common';
import type { PantryProduct as PrismaPantryProduct, Prisma } from '../generated/prisma/client';
import { paginationSkipTake } from '@omni/shared/common';

import { prisma } from '../common/db';
import { decimalToNumber, normalizeName, toIsoDateString, toIsoDateTimeString } from '../common/utils/lifestyle';
import { HttpError } from '../common/http';
import { getHouseholdId, withHousehold } from '../household/household.service';

function mapProduct(row: PrismaPantryProduct, today = startOfTodayInAppTz()): PantryProduct {
  const quantity = decimalToNumber(row.quantity) ?? 0;
  const minQuantity = decimalToNumber(row.minQuantity);
  return {
    id: row.id,
    createdById: row.createdById,
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantity,
    minQuantity,
    expiresAt: row.expiresAt ? toIsoDateString(row.expiresAt) : null,
    isLowStock: isLowStock(quantity, minQuantity),
    isExpiringSoon: isExpiringSoon(row.expiresAt, today),
    createdAt: toIsoDateTimeString(row.createdAt),
    updatedAt: toIsoDateTimeString(row.updatedAt),
  };
}

function computeQuantityToBuy(quantity: number, minQuantity: number): number {
  const diff = minQuantity - quantity;
  return Math.max(Math.ceil(diff), 1);
}

async function getHouseholdProduct(householdId: string, productId: string) {
  const product = await prisma.pantryProduct.findFirst({ where: { id: productId, householdId } });
  if (!product) throw new HttpError(404, 'Producto no encontrado');
  return product;
}

/**
 * Productos del usuario con alerta de alacena: bajo stock y por vencer, cada uno según su propia regla (un producto
 * puede estar en las dos listas). Fuente única del resumen de alacena.
 */
export async function loadPantryAlerts(userId: string, today = startOfTodayInAppTz()) {
  return loadHouseholdAlerts(await getHouseholdId(userId), today);
}

/** Alertas de alacena de un hogar ya resuelto, para quien ya tiene el `householdId` y no quiere otra query. */
async function loadHouseholdAlerts(householdId: string, today = startOfTodayInAppTz()) {
  const products = await prisma.pantryProduct.findMany({
    where: { householdId },
    select: { id: true, name: true, quantity: true, minQuantity: true, expiresAt: true },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
  const lowStock: { id: string; name: string }[] = [];
  const expiringSoon: { id: string; name: string }[] = [];
  for (const p of products) {
    const quantity = decimalToNumber(p.quantity) ?? 0;
    if (isLowStock(quantity, decimalToNumber(p.minQuantity))) lowStock.push({ id: p.id, name: p.name });
    if (isExpiringSoon(p.expiresAt, today)) expiringSoon.push({ id: p.id, name: p.name });
  }
  return { totalProducts: products.length, lowStock, expiringSoon };
}

export async function getSummary(userId: string): Promise<PantrySummary> {
  const householdId = await getHouseholdId(userId);
  const [alerts, shoppingListCount] = await Promise.all([
    loadHouseholdAlerts(householdId),
    prisma.pantryShoppingListItem.count({ where: { householdId, checked: false } }),
  ]);
  return {
    totalProducts: alerts.totalProducts,
    expiringSoonCount: alerts.expiringSoon.length,
    lowStockCount: alerts.lowStock.length,
    shoppingListCount,
  };
}

export async function listProducts(userId: string, params: ListPantryProductsParams) {
  const { skip, take } = paginationSkipTake(params);
  const householdId = await getHouseholdId(userId);
  const where = {
    householdId,
    ...(params.category && { category: params.category }),
    ...(params.q && {
      OR: [
        { name: { contains: params.q, mode: 'insensitive' as const } },
        { nameNormalized: { contains: normalizeName(params.q), mode: 'insensitive' as const } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    prisma.pantryProduct.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
    prisma.pantryProduct.count({ where }),
  ]);
  const today = startOfTodayInAppTz();
  return { items: items.map(p => mapProduct(p, today)), total, page: params.page, limit: params.limit };
}

export async function suggestProducts(userId: string, params: SuggestPantryProductsParams) {
  const q = normalizeName(params.q);
  const householdId = await getHouseholdId(userId);
  const items = await prisma.pantryProduct.findMany({
    where: {
      householdId,
      OR: [{ nameNormalized: { contains: q } }, { name: { contains: params.q.trim(), mode: 'insensitive' } }],
    },
    take: params.limit,
    orderBy: { name: 'asc' },
    select: { id: true, name: true, category: true, unit: true },
  });
  return items;
}

export async function getProduct(userId: string, productId: string) {
  const product = await getHouseholdProduct(await getHouseholdId(userId), productId);
  return mapProduct(product);
}

export async function createProduct(userId: string, dto: CreatePantryProductPayload) {
  const nameNormalized = normalizeName(dto.name);
  return withHousehold(userId, async (tx, householdId) => {
    const existing = await tx.pantryProduct.findUnique({
      where: { householdId_nameNormalized: { householdId, nameNormalized } },
    });
    if (existing) throw new HttpError(409, 'Ya existe un producto con ese nombre');

    const product = await tx.pantryProduct.create({
      data: {
        householdId,
        createdById: userId,
        name: dto.name.trim(),
        nameNormalized,
        category: dto.category,
        unit: dto.unit,
        quantity: dto.quantity,
        minQuantity: dto.minQuantity ?? null,
        expiresAt: dto.expiresAt ? parseIsoDateString(dto.expiresAt) : null,
      },
    });
    return mapProduct(product);
  });
}

export async function updateProduct(userId: string, productId: string, dto: UpdatePantryProductPayload) {
  return withHousehold(userId, async (tx, householdId) => {
    const current = await tx.pantryProduct.findFirst({ where: { id: productId, householdId } });
    if (!current) throw new HttpError(404, 'Producto no encontrado');
    let nameNormalized = current.nameNormalized;
    if (dto.name && normalizeName(dto.name) !== current.nameNormalized) {
      nameNormalized = normalizeName(dto.name);
      const conflict = await tx.pantryProduct.findUnique({
        where: { householdId_nameNormalized: { householdId, nameNormalized } },
      });
      if (conflict && conflict.id !== productId) {
        throw new HttpError(409, 'Ya existe un producto con ese nombre');
      }
    }

    const product = await tx.pantryProduct.update({
      where: { id: productId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim(), nameNormalized }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.minQuantity !== undefined && { minQuantity: dto.minQuantity }),
        ...(dto.expiresAt !== undefined && {
          expiresAt: dto.expiresAt ? parseIsoDateString(dto.expiresAt) : null,
        }),
      },
    });
    return mapProduct(product);
  });
}

export async function deleteProduct(userId: string, productId: string) {
  await withHousehold(userId, async (tx, householdId) => {
    const product = await tx.pantryProduct.findFirst({ where: { id: productId, householdId } });
    if (!product) throw new HttpError(404, 'Producto no encontrado');
    await tx.pantryShoppingListItem.deleteMany({
      where: { pantryProductId: productId, source: 'AUTO', checked: false },
    });
    await tx.pantryProduct.delete({ where: { id: productId } });
  });
}

function mapShoppingItem(
  row: {
    id: string;
    createdById: string | null;
    name: string;
    source: 'AUTO' | 'MANUAL';
    quantityToBuy: PrismaPantryProduct['quantity'];
    unit: PrismaPantryProduct['unit'];
    checked: boolean;
    pantryProductId: string | null;
  },
  product?: PrismaPantryProduct | null,
  today = startOfTodayInAppTz()
): PantryShoppingListItem {
  const quantity = product ? (decimalToNumber(product.quantity) ?? 0) : null;
  const minQuantity = product ? decimalToNumber(product.minQuantity) : null;
  return {
    id: row.id,
    createdById: row.createdById,
    name: row.name,
    source: row.source,
    quantityToBuy: decimalToNumber(row.quantityToBuy) ?? 0,
    unit: row.unit,
    checked: row.checked,
    pantryProductId: row.pantryProductId,
    isLowStock: quantity != null && minQuantity != null ? isLowStock(quantity, minQuantity) : false,
    isExpiringSoon: product ? isExpiringSoon(product.expiresAt, today) : false,
    ...(product && {
      linkedProduct: {
        id: product.id,
        name: product.name,
        quantity: quantity ?? 0,
        unit: product.unit,
      },
    }),
  };
}

export async function listShoppingList(userId: string) {
  const householdId = await getHouseholdId(userId);
  const items = await prisma.pantryShoppingListItem.findMany({
    where: { householdId },
    include: { pantryProduct: true },
    orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
  });
  const today = startOfTodayInAppTz();
  return items.map(i => mapShoppingItem(i, i.pantryProduct, today));
}

export async function generateShoppingList(userId: string) {
  await withHousehold(userId, async (tx, householdId) => {
    const withMinimum = await tx.pantryProduct.findMany({
      where: { householdId, minQuantity: { not: null } },
    });
    const lowStock = withMinimum.filter(p =>
      isLowStock(decimalToNumber(p.quantity) ?? 0, decimalToNumber(p.minQuantity))
    );
    if (lowStock.length === 0) return;

    const pending = await tx.pantryShoppingListItem.findMany({
      where: {
        householdId,
        source: 'AUTO',
        checked: false,
        pantryProductId: { in: lowStock.map(p => p.id) },
      },
    });
    const pendingByProduct = new Map(pending.map(item => [item.pantryProductId, item]));

    const toCreate: Prisma.PantryShoppingListItemCreateManyInput[] = [];
    const toUpdate: { id: string; quantityToBuy: number; name: string; unit: PrismaPantryProduct['unit'] }[] = [];
    for (const product of lowStock) {
      const quantityToBuy = computeQuantityToBuy(
        decimalToNumber(product.quantity) ?? 0,
        decimalToNumber(product.minQuantity) ?? 0
      );
      const existing = pendingByProduct.get(product.id);
      if (!existing) {
        toCreate.push({
          householdId,
          createdById: userId,
          pantryProductId: product.id,
          name: product.name,
          source: 'AUTO',
          quantityToBuy,
          unit: product.unit,
        });
      } else if (
        decimalToNumber(existing.quantityToBuy) !== quantityToBuy ||
        existing.name !== product.name ||
        existing.unit !== product.unit
      ) {
        toUpdate.push({ id: existing.id, quantityToBuy, name: product.name, unit: product.unit });
      }
    }

    if (toCreate.length > 0) {
      await tx.pantryShoppingListItem.createMany({ data: toCreate, skipDuplicates: true });
    }
    for (const { id, ...data } of toUpdate) {
      await tx.pantryShoppingListItem.updateMany({ where: { id, checked: false }, data });
    }
  });

  return listShoppingList(userId);
}

export async function addShoppingListItem(userId: string, dto: AddShoppingListItemPayload) {
  return withHousehold(userId, async (tx, householdId) => {
    if (dto.pantryProductId) {
      const product = await tx.pantryProduct.findFirst({ where: { id: dto.pantryProductId, householdId } });
      if (!product) throw new HttpError(404, 'Producto no encontrado');
      const item = await tx.pantryShoppingListItem.create({
        data: {
          householdId,
          createdById: userId,
          pantryProductId: product.id,
          name: product.name,
          source: 'MANUAL',
          quantityToBuy: dto.quantityToBuy,
          unit: product.unit,
        },
      });
      return mapShoppingItem(item, product);
    }

    const item = await tx.pantryShoppingListItem.create({
      data: {
        householdId,
        createdById: userId,
        name: dto.name!.trim(),
        source: 'MANUAL',
        quantityToBuy: dto.quantityToBuy,
        unit: dto.unit!,
      },
    });
    return mapShoppingItem(item);
  });
}

export async function completeShoppingListItem(userId: string, itemId: string, dto: CompleteShoppingListItemPayload) {
  return withHousehold(userId, async (tx, householdId) => {
    const item = await tx.pantryShoppingListItem.findFirst({
      where: { id: itemId, householdId },
    });
    if (!item) throw new HttpError(404, 'Ítem no encontrado');
    if (item.checked) throw new HttpError(409, 'El ítem ya estaba marcado');

    const quantityPurchased = dto.quantityPurchased ?? decimalToNumber(item.quantityToBuy) ?? 1;
    const nameNormalized = normalizeName(item.name);
    const existingByName = item.pantryProductId
      ? null
      : await tx.pantryProduct.findUnique({ where: { householdId_nameNormalized: { householdId, nameNormalized } } });
    const existingId = item.pantryProductId ?? existingByName?.id;
    const target = existingId ? { existingId } : dto.category ? { newCategory: dto.category } : null;
    if (!target) {
      throw new HttpError(400, 'La categoría es obligatoria para productos nuevos');
    }

    const claimed = await tx.pantryShoppingListItem.updateMany({
      where: { id: itemId, householdId, checked: false },
      data: { checked: true },
    });
    if (claimed.count === 0) throw new HttpError(409, 'El ítem ya estaba marcado');

    const linkedRow =
      'existingId' in target
        ? await tx.pantryProduct.update({
            where: { id: target.existingId },
            data: { quantity: { increment: quantityPurchased } },
          })
        : await tx.pantryProduct.create({
            data: {
              householdId,
              createdById: userId,
              name: item.name,
              nameNormalized,
              category: target.newCategory,
              unit: item.unit,
              quantity: quantityPurchased,
            },
          });

    return { item: mapShoppingItem({ ...item, checked: true }, linkedRow), product: mapProduct(linkedRow) };
  });
}

export async function deleteShoppingListItem(userId: string, itemId: string) {
  await withHousehold(userId, async (tx, householdId) => {
    const { count } = await tx.pantryShoppingListItem.deleteMany({ where: { id: itemId, householdId } });
    if (count === 0) throw new HttpError(404, 'Ítem no encontrado');
  });
}

export async function clearCheckedShoppingList(userId: string) {
  await withHousehold(userId, (tx, householdId) =>
    tx.pantryShoppingListItem.deleteMany({ where: { householdId, checked: true } })
  );
}
