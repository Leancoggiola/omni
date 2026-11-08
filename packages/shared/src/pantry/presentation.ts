import type { PantryCategory, PantryUnit } from './constants';

export const PANTRY_CATEGORY_LABELS: Record<PantryCategory, string> = {
  DAIRY: 'Lácteos',
  MEAT: 'Carnes',
  FRUIT: 'Frutas',
  VEGETABLE: 'Verduras',
  GRAINS: 'Granos',
  BEVERAGES: 'Bebidas',
  SNACKS: 'Snacks',
  CONDIMENTS: 'Condimentos',
  FROZEN: 'Congelados',
  CLEANING: 'Limpieza',
};

export const PANTRY_UNIT_LABELS: Record<PantryUnit, { one: string; other: string }> = {
  UNITS: { one: 'unidad', other: 'unidades' },
  PACKAGES: { one: 'paquete', other: 'paquetes' },
};

/** `1 paquete`, `2 paquetes`, `1,5 unidades`: singular solo con exactamente 1. */
export function formatPantryQuantity(quantity: number, unit: PantryUnit): string {
  const label = quantity === 1 ? PANTRY_UNIT_LABELS[unit].one : PANTRY_UNIT_LABELS[unit].other;
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(quantity)} ${label}`;
}

/** Cantidad que se pide al generar la lista: lo que falta para llegar al mínimo, nunca menos de 1. */
export function computeQuantityToBuy(quantity: number, minQuantity: number): number {
  return Math.max(Math.ceil(minQuantity - quantity), 1);
}
