import { z } from 'zod';

import type { CreatePantryProductPayload, PantryCategory, PantryProduct, PantryUnit } from '@omni/shared/pantry';

import { AMOUNT_MAX_10_2 } from '@omni/shared/common';
import { PANTRY_CATEGORIES, PANTRY_UNITS } from '@omni/shared/pantry';

export interface ProductFormValues {
  name: string;
  category: PantryCategory | null;
  unit: PantryUnit;
  quantity: number | string;
  minQuantity: number | string;
  expiresAt: string | null;
}

const amount = (message: string) => z.number({ error: message }).min(0, message).max(AMOUNT_MAX_10_2, message);

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre').max(120, 'Máximo 120 caracteres'),
  category: z
    .enum(PANTRY_CATEGORIES)
    .nullable()
    .refine(value => value !== null, 'Elegí una categoría'),
  unit: z.enum(PANTRY_UNITS),
  quantity: amount('Ingresá una cantidad'),
  minQuantity: z.union([z.literal(''), amount('Ingresá un mínimo válido')]),
  expiresAt: z.string().nullable(),
});

export const INITIAL_PRODUCT_FORM_VALUES: ProductFormValues = {
  name: '',
  category: null,
  unit: 'UNITS',
  quantity: '',
  minQuantity: '',
  expiresAt: null,
};

/** Valores del form de edición a partir del producto guardado. */
export function toProductFormValues(product: PantryProduct): ProductFormValues {
  return {
    name: product.name,
    category: product.category,
    unit: product.unit,
    quantity: product.quantity,
    minQuantity: product.minQuantity ?? '',
    expiresAt: product.expiresAt ? product.expiresAt.slice(0, 10) : null,
  };
}

/** Payload completo: sirve para el alta y para el PATCH (quita el mínimo y la fecha cuando se vacían). */
export function toProductPayload(values: ProductFormValues): CreatePantryProductPayload {
  return {
    name: values.name.trim(),
    category: values.category as PantryCategory,
    unit: values.unit,
    quantity: Number(values.quantity),
    minQuantity: values.minQuantity === '' ? null : Number(values.minQuantity),
    expiresAt: values.expiresAt || null,
  };
}
