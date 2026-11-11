import type { PantryCategory } from '@omni/shared/pantry';

const NAME_MAX_LENGTH = 120;
const BRAND_MAX_LENGTH = 60;

export interface CatalogProduct {
  name: string;
  brand: string | null;
  packageSize: string | null;
  category: PantryCategory | null;
}

export interface OpenFoodFactsFields {
  names: (string | null | undefined)[];
  brands?: string | null;
  quantity?: string | null;
  categoriesTags?: string[] | null;
}

interface CategoryRule {
  category: PantryCategory;
  tags: string[];
  keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  { category: 'FROZEN', tags: ['en:frozen-foods'], keywords: [] },
  {
    category: 'CLEANING',
    tags: ['en:cleaning-products', 'en:household-products'],
    keywords: ['detergente', 'lavandina', 'jabon', 'suavizante'],
  },
  {
    category: 'DAIRY',
    tags: ['en:dairies', 'en:milks', 'en:yogurts', 'en:cheeses', 'en:butters', 'en:creams'],
    keywords: ['leche', 'yogur', 'yogurt', 'queso', 'manteca'],
  },
  {
    category: 'MEAT',
    tags: [
      'en:meats-and-their-products',
      'en:meats',
      'en:prepared-meats',
      'en:fishes-and-their-products',
      'en:fishes',
      'en:seafood',
    ],
    keywords: [],
  },
  {
    category: 'BEVERAGES',
    tags: ['en:beverages', 'en:waters', 'en:sodas', 'en:juices', 'en:teas', 'en:coffees'],
    keywords: ['yerba', 'gaseosa', 'jugo', 'agua', 'cafe', 'te'],
  },
  {
    category: 'SNACKS',
    tags: ['en:snacks', 'en:sweet-snacks', 'en:salty-snacks', 'en:biscuits', 'en:chocolates', 'en:confectioneries'],
    keywords: ['galletita', 'alfajor', 'chocolate'],
  },
  {
    category: 'CONDIMENTS',
    tags: [
      'en:condiments',
      'en:sauces',
      'en:vegetable-oils',
      'en:fats',
      'en:salts',
      'en:spices',
      'en:vinegars',
      'en:sugars',
    ],
    keywords: ['aceite', 'mayonesa', 'mostaza', 'salsa', 'azucar'],
  },
  {
    category: 'GRAINS',
    tags: ['en:cereals-and-potatoes', 'en:pastas', 'en:rices', 'en:flours', 'en:breads', 'en:breakfast-cereals'],
    keywords: ['fideo', 'arroz', 'harina', 'polenta', 'avena'],
  },
  { category: 'FRUIT', tags: ['en:fruits', 'en:canned-fruits'], keywords: [] },
  {
    category: 'VEGETABLE',
    tags: ['en:vegetables', 'en:canned-vegetables', 'en:legumes', 'en:vegetables-based-foods'],
    keywords: [],
  },
];

const KEYWORD_PATTERNS = CATEGORY_RULES.filter(rule => rule.keywords.length > 0).map(rule => ({
  category: rule.category,
  pattern: new RegExp(`(?<!\\b(?:de|del|al|a la|con|en|sin|para) )\\b(?:${rule.keywords.join('|')})(?:s|es)?\\b`),
}));

const DULCE_DE_LECHE_TAG = /dulces?-de-leche|milk-jams?|confitures?-de-lait/;

const SIZE_PATTERN =
  /^(\d+(?:[.,]\d+)?)\s*(kilogramos?|kilos?|kgs?|gramos?|grs?|g|litros?|lts?|l|mililitros?|ml|cm3|cc)(?![a-z0-9])/;
const THOUSANDS_PATTERN = /^\d{1,3}\.\d{3}$/;
const MULTIPACK_PATTERN = /(?:\bx|×)\s*\d/;

const SIZE_UNITS: { pattern: RegExp; label: string }[] = [
  { pattern: /^k/, label: 'kg' },
  { pattern: /^g/, label: 'g' },
  { pattern: /^(ml|mililitro|cm3|cc)/, label: 'ml' },
  { pattern: /^l/, label: 'L' },
];

/** Pasa a minúsculas, saca tildes y colapsa espacios para comparar textos escritos de distinta forma. */
function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Colapsa los espacios internos y recorta el texto; `null` si queda vacío. */
function cleanText(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned : null;
}

/**
 * Lleva la cantidad que escribe la comunidad de Open Food Facts ("500 gr", "1.5lts", "2,25 L", "400 g (14 oz)") a
 * un tamaño corto para sumar al nombre ("500 g", "1,5 L"). En gramos y mililitros un punto seguido de tres dígitos
 * es separador de miles ("1.000 ml"). Sin unidad reconocible, o con un multipack ("6 x 250 ml", "250 ml x 6"),
 * devuelve `null`: es preferible omitir el tamaño a inventarlo.
 */
export function parsePackageSize(quantity: string | null | undefined): string | null {
  if (!quantity) return null;
  const normalized = normalizeText(quantity);
  if (MULTIPACK_PATTERN.test(normalized)) return null;
  const match = SIZE_PATTERN.exec(normalized);
  if (!match) return null;

  const [, rawAmount = '', rawUnit = ''] = match;
  const unit = SIZE_UNITS.find(candidate => candidate.pattern.test(rawUnit))?.label;
  if (!unit) return null;
  const isThousands = (unit === 'g' || unit === 'ml') && THOUSANDS_PATTERN.test(rawAmount);
  const amount = Number(isThousands ? rawAmount.replace('.', '') : rawAmount.replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return `${String(amount).replace('.', ',')} ${unit}`;
}

/**
 * Categoría de la alacena para un producto de Open Food Facts. Por etiquetas gana la primera regla que coincide en
 * el orden de `CATEGORY_RULES` (un helado es congelado antes que lácteo, una leche chocolatada es lácteo antes que
 * bebida), y el dulce de leche no cuenta como lácteo. Si ninguna etiqueta alcanza se busca por palabras del nombre:
 * no cuentan las que vienen después de una preposición, porque describen al producto y no lo nombran ("Dulce de
 * leche", "Galletitas de agua", "Atún al agua", "Chocolate con leche"), y entre las que quedan gana la que aparece
 * primero. Sin coincidencia devuelve `null` y la categoría se elige en el formulario.
 */
export function mapPantryCategory(tags: string[], name: string): PantryCategory | null {
  const tagSet = new Set(tags);
  const isDulceDeLeche = tags.some(tag => DULCE_DE_LECHE_TAG.test(tag));
  const rule = CATEGORY_RULES.find(
    candidate => !(candidate.category === 'DAIRY' && isDulceDeLeche) && candidate.tags.some(tag => tagSet.has(tag))
  );
  if (rule) return rule.category;

  const text = normalizeText(name);
  let best: { category: PantryCategory; index: number } | null = null;
  for (const { category, pattern } of KEYWORD_PATTERNS) {
    const index = text.search(pattern);
    if (index >= 0 && (!best || index < best.index)) best = { category, index };
  }
  return best?.category ?? null;
}

/** Indica si `part` ya está escrito dentro de `text`, sin importar tildes, mayúsculas ni espacios. */
function alreadyIncludes(text: string, part: string): boolean {
  const compact = (value: string) => normalizeText(value).replace(/\s/g, '');
  return compact(text).includes(compact(part));
}

/**
 * Nombre sugerido para el producto: nombre, marca y tamaño, sin repetir lo que el nombre ya dice ("Coca Cola
 * Original 2,25 L" no vuelve a sumar "Coca-Cola" como marca). Si no entra en el largo máximo del nombre de un
 * producto se resigna primero el tamaño, después la marca, y por último se recorta.
 */
export function composeProductName(name: string, brand: string | null, packageSize: string | null): string {
  const withBrand = brand && !alreadyIncludes(name.replace(/-/g, ' '), brand.replace(/-/g, ' ')) ? brand : null;
  const withSize = packageSize && !alreadyIncludes(name, packageSize) ? packageSize : null;
  const candidates = [[name, withBrand, withSize], [name, withBrand], [name]];
  for (const parts of candidates) {
    const composed = parts.filter(Boolean).join(' ');
    if (composed.length <= NAME_MAX_LENGTH) return composed;
  }
  return name.slice(0, NAME_MAX_LENGTH).trim();
}

/**
 * Arma el producto de catálogo a partir de los campos de Open Food Facts. El nombre sale del primero de `names` que
 * tenga texto (se pasa primero el nombre en castellano) y la marca, de la primera de la lista separada por comas.
 * Sin nombre no hay nada que sugerir y devuelve `null`: el código cuenta como no encontrado.
 */
export function buildCatalogProduct(fields: OpenFoodFactsFields): CatalogProduct | null {
  const name = fields.names.map(cleanText).find(candidate => candidate !== null);
  if (!name) return null;

  const brand = cleanText(fields.brands?.split(',')[0])?.slice(0, BRAND_MAX_LENGTH).trim() ?? null;
  return {
    name: name.slice(0, NAME_MAX_LENGTH).trim(),
    brand: brand || null,
    packageSize: parsePackageSize(fields.quantity),
    category: mapPantryCategory(fields.categoriesTags ?? [], name),
  };
}
