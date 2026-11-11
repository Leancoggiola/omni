import { z } from 'zod';

import { AMOUNT_MAX_10_2 } from '../common/limits';
import type { PantryCategory, PantryUnit } from './constants';
import { createPantryProductSchema } from './schemas';
import type { PantryProduct } from './types';

const BARCODE_PATTERN = /^(\d{8}|\d{13})$/;
const INTERNAL_EAN13_PATTERN = /^(02|04|2)/;
const INTERNAL_EAN8_PATTERN = /^[02]/;
const UPC_A_PATTERN = /^\d{12}$/;
const TWO_DECIMALS_MESSAGE = 'La cantidad admite hasta dos decimales';

/**
 * Valida el dígito verificador GS1 de un EAN-13 o EAN-8: desde la derecha, sin contar el verificador, los dígitos
 * pesan 3 y 1 alternados, y el verificador completa la suma hasta el próximo múltiplo de 10. Descarta la mayoría de
 * las lecturas parciales de la cámara antes de salir a la red.
 */
export function hasValidCheckDigit(barcode: string): boolean {
  if (!BARCODE_PATTERN.test(barcode)) return false;
  const digits = [...barcode].map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/**
 * Indica si el código es de uso interno de un comercio (GS1 reserva los EAN-13 que empiezan con 02, 04 o 2 y los
 * EAN-8 que empiezan con 0 o 2): son los de balanza, fiambrería o panadería, que cada local arma a su manera y no
 * están en ningún catálogo. Se cortan antes de salir a la red.
 */
export function isInternalBarcode(barcode: string): boolean {
  return barcode.length === 8 ? INTERNAL_EAN8_PATTERN.test(barcode) : INTERNAL_EAN13_PATTERN.test(barcode);
}

/**
 * Lleva lo que lee la cámara a la forma que acepta la API. Un UPC-A (12 dígitos, el de los productos importados de
 * Estados Unidos) es el EAN-13 que empieza con cero, y así lo guarda Open Food Facts; el resto se devuelve igual, sin
 * los espacios de los bordes.
 */
export function normalizeBarcode(raw: string): string {
  const barcode = raw.trim();
  return UPC_A_PATTERN.test(barcode) ? `0${barcode}` : barcode;
}

export const pantryBarcodeSchema = z
  .string()
  .regex(BARCODE_PATTERN, 'El código tiene que ser un EAN de 8 o 13 dígitos')
  .refine(hasValidCheckDigit, 'El código de barras no es válido');

export const pantryBarcodeParamsSchema = z.object({ barcode: pantryBarcodeSchema });

export const scanPantryProductSchema = z.object({
  barcode: pantryBarcodeSchema,
  quantity: z.number().positive().max(AMOUNT_MAX_10_2).multipleOf(0.01, TWO_DECIMALS_MESSAGE).default(1),
  product: createPantryProductSchema.omit({ quantity: true }).optional(),
});

export type ScanPantryProductPayload = z.input<typeof scanPantryProductSchema>;
export type ParsedScanPantryProduct = z.output<typeof scanPantryProductSchema>;

export const adjustPantryStockSchema = z
  .object({
    delta: z
      .number()
      .min(-AMOUNT_MAX_10_2)
      .max(AMOUNT_MAX_10_2)
      .multipleOf(0.01, TWO_DECIMALS_MESSAGE)
      .refine(delta => delta !== 0, 'El ajuste no puede ser cero'),
  })
  .strict();

export type AdjustPantryStockPayload = z.infer<typeof adjustPantryStockSchema>;

export interface PantryBarcodeSuggestion {
  name: string;
  brand: string | null;
  packageSize: string | null;
  category: PantryCategory | null;
  unit: PantryUnit;
  sourceUrl: string;
}

export const PANTRY_BARCODE_STATUSES = ['IN_PANTRY', 'FOUND', 'NOT_FOUND'] as const;
export type PantryBarcodeStatus = (typeof PANTRY_BARCODE_STATUSES)[number];

interface PantryBarcodeLookupData {
  IN_PANTRY: { product: PantryProduct };
  FOUND: { suggestion: PantryBarcodeSuggestion };
  NOT_FOUND: object;
}

export type PantryBarcodeLookup = {
  [Status in PantryBarcodeStatus]: { status: Status; barcode: string } & PantryBarcodeLookupData[Status];
}[PantryBarcodeStatus];

export const PANTRY_SCAN_OUTCOMES = ['CREATED', 'INCREMENTED', 'LINKED'] as const;
export type PantryScanOutcome = (typeof PANTRY_SCAN_OUTCOMES)[number];

export interface PantryScanResult {
  outcome: PantryScanOutcome;
  product: PantryProduct;
}
