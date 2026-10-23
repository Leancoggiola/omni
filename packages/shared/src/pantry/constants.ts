export const PANTRY_UNITS = ['UNITS', 'PACKAGES'] as const satisfies readonly string[];

export type PantryUnit = (typeof PANTRY_UNITS)[number];

export const PANTRY_CATEGORIES = [
  'DAIRY',
  'MEAT',
  'FRUIT',
  'VEGETABLE',
  'GRAINS',
  'BEVERAGES',
  'SNACKS',
  'CONDIMENTS',
  'FROZEN',
  'CLEANING',
] as const satisfies readonly string[];

export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];

export const PANTRY_SHOPPING_SOURCES = ['AUTO', 'MANUAL'] as const satisfies readonly string[];

export type PantryShoppingSource = (typeof PANTRY_SHOPPING_SOURCES)[number];

export const PANTRY_EXPIRING_SOON_DAYS = 7;
