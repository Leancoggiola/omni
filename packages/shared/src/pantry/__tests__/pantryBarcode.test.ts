import { describe, expect, it } from 'vitest';

import { API_PATHS } from '../../api/paths';
import {
  adjustPantryStockSchema,
  hasValidCheckDigit,
  isInternalBarcode,
  isPantryKey,
  normalizeBarcode,
  pantryBarcodeParamsSchema,
  pantryBarcodeSchema,
  scanPantryProductSchema,
  updatePantryProductSchema,
} from '..';

const EAN13 = '7622210449283';
const EAN8 = '96385074';
const PRODUCT = { name: 'Galletitas', category: 'SNACKS', unit: 'PACKAGES' };

describe('hasValidCheckDigit', () => {
  it('acepta EAN-13 y EAN-8 con el verificador correcto', () => {
    expect(hasValidCheckDigit(EAN13)).toBe(true);
    expect(hasValidCheckDigit('5449000000996')).toBe(true);
    expect(hasValidCheckDigit(EAN8)).toBe(true);
    expect(hasValidCheckDigit('0000000000000')).toBe(true);
  });

  it('rechaza un verificador que no coincide', () => {
    expect(hasValidCheckDigit('7622210449284')).toBe(false);
    expect(hasValidCheckDigit('96385075')).toBe(false);
  });

  it('rechaza dos dígitos vecinos cruzados', () => {
    expect(hasValidCheckDigit('7622210449823')).toBe(false);
  });

  it('rechaza lo que no es un EAN de 8 o 13 dígitos', () => {
    expect(hasValidCheckDigit('')).toBe(false);
    expect(hasValidCheckDigit('762221044928')).toBe(false);
    expect(hasValidCheckDigit('76222104492833')).toBe(false);
    expect(hasValidCheckDigit('76222104A9283')).toBe(false);
  });
});

describe('pantryBarcodeSchema', () => {
  it('acepta EAN-13 y EAN-8 válidos', () => {
    expect(pantryBarcodeSchema.safeParse(EAN13).success).toBe(true);
    expect(pantryBarcodeSchema.safeParse(EAN8).success).toBe(true);
  });

  it('rechaza largos distintos, letras, espacios y verificadores inválidos', () => {
    for (const value of ['123', '762221044928', '012345678905', ` ${EAN13}`, '7622210449284', 'ABCDEFGH', '']) {
      expect(pantryBarcodeSchema.safeParse(value).success).toBe(false);
    }
  });

  it('rechaza valores que no son texto', () => {
    expect(pantryBarcodeSchema.safeParse(7622210449283).success).toBe(false);
    expect(pantryBarcodeSchema.safeParse(null).success).toBe(false);
  });

  it('valida el parámetro de ruta', () => {
    expect(pantryBarcodeParamsSchema.safeParse({ barcode: EAN13 }).success).toBe(true);
    expect(pantryBarcodeParamsSchema.safeParse({ barcode: 'scan' }).success).toBe(false);
  });
});

describe('isInternalBarcode', () => {
  it('marca los EAN-13 de uso interno del comercio', () => {
    expect(isInternalBarcode('2000000000008')).toBe(true);
    expect(isInternalBarcode('2912345678900')).toBe(true);
    expect(isInternalBarcode('0200000000004')).toBe(true);
    expect(isInternalBarcode('0412345678903')).toBe(true);
  });

  it('marca los EAN-8 que empiezan con 0 o 2', () => {
    expect(isInternalBarcode('20000004')).toBe(true);
    expect(isInternalBarcode('01234565')).toBe(true);
  });

  it('deja pasar los códigos de producto', () => {
    expect(isInternalBarcode(EAN13)).toBe(false);
    expect(isInternalBarcode('5449000000996')).toBe(false);
    expect(isInternalBarcode('0012345678905')).toBe(false);
    expect(isInternalBarcode('0312345678906')).toBe(false);
    expect(isInternalBarcode(EAN8)).toBe(false);
  });
});

describe('normalizeBarcode', () => {
  it('lleva un UPC-A de 12 dígitos al EAN-13 equivalente', () => {
    expect(normalizeBarcode('012345678905')).toBe('0012345678905');
    expect(pantryBarcodeSchema.safeParse(normalizeBarcode('012345678905')).success).toBe(true);
  });

  it('un UPC-A de uso interno queda como EAN-13 interno', () => {
    expect(isInternalBarcode(normalizeBarcode('212345678901'))).toBe(true);
    expect(isInternalBarcode(normalizeBarcode('412345678901'))).toBe(true);
  });

  it('deja igual los EAN y recorta los espacios de los bordes', () => {
    expect(normalizeBarcode(EAN13)).toBe(EAN13);
    expect(normalizeBarcode(` ${EAN8} `)).toBe(EAN8);
  });

  it('no arregla lo que no es un código: lo rechaza el schema', () => {
    expect(pantryBarcodeSchema.safeParse(normalizeBarcode('12345')).success).toBe(false);
    expect(pantryBarcodeSchema.safeParse(normalizeBarcode('012345678906')).success).toBe(false);
  });
});

describe('scanPantryProductSchema', () => {
  it('suma de a uno si no se indica la cantidad', () => {
    const parsed = scanPantryProductSchema.parse({ barcode: EAN13 });

    expect(parsed).toEqual({ barcode: EAN13, quantity: 1 });
  });

  it('acepta los datos del producto para darlo de alta', () => {
    const parsed = scanPantryProductSchema.parse({
      barcode: EAN13,
      quantity: 2,
      product: { ...PRODUCT, name: '  Galletitas  ', minQuantity: 1, expiresAt: '2026-12-31' },
    });

    expect(parsed.product).toEqual({ ...PRODUCT, minQuantity: 1, expiresAt: '2026-12-31' });
    expect(parsed.quantity).toBe(2);
  });

  it('descarta la cantidad que venga dentro del producto', () => {
    const parsed = scanPantryProductSchema.parse({ barcode: EAN13, product: { ...PRODUCT, quantity: 9 } });

    expect(parsed.product).toEqual(PRODUCT);
    expect(parsed.quantity).toBe(1);
  });

  it('rechaza cantidades que no suman', () => {
    expect(scanPantryProductSchema.safeParse({ barcode: EAN13, quantity: 0 }).success).toBe(false);
    expect(scanPantryProductSchema.safeParse({ barcode: EAN13, quantity: -1 }).success).toBe(false);
    expect(scanPantryProductSchema.safeParse({ barcode: EAN13, quantity: 100_000_000 }).success).toBe(false);
  });

  it.each([0.01, 0.07, 0.5, 1.15, 2.68, 99_999_999.99])('acepta %d: hasta dos decimales', quantity => {
    expect(scanPantryProductSchema.safeParse({ barcode: EAN13, quantity }).success).toBe(true);
  });

  it.each([0.004, 0.125, 1.005])('rechaza %d: más de dos decimales', quantity => {
    expect(scanPantryProductSchema.safeParse({ barcode: EAN13, quantity }).success).toBe(false);
  });

  it('rechaza un código inválido o un producto incompleto', () => {
    expect(scanPantryProductSchema.safeParse({ barcode: '7622210449284' }).success).toBe(false);
    expect(scanPantryProductSchema.safeParse({}).success).toBe(false);
    expect(scanPantryProductSchema.safeParse({ barcode: EAN13, product: { name: 'Galletitas' } }).success).toBe(false);
    expect(scanPantryProductSchema.safeParse({ barcode: EAN13, product: { ...PRODUCT, name: ' ' } }).success).toBe(
      false
    );
    expect(
      scanPantryProductSchema.safeParse({ barcode: EAN13, product: { ...PRODUCT, category: 'OTHER' } }).success
    ).toBe(false);
  });
});

describe('adjustPantryStockSchema', () => {
  it('acepta sumar y restar', () => {
    expect(adjustPantryStockSchema.safeParse({ delta: 1 }).success).toBe(true);
    expect(adjustPantryStockSchema.safeParse({ delta: -1 }).success).toBe(true);
    expect(adjustPantryStockSchema.safeParse({ delta: 0.5 }).success).toBe(true);
  });

  it('rechaza el cero, lo que no es número y lo que no entra en la columna', () => {
    expect(adjustPantryStockSchema.safeParse({ delta: 0 }).success).toBe(false);
    expect(adjustPantryStockSchema.safeParse({ delta: '1' }).success).toBe(false);
    expect(adjustPantryStockSchema.safeParse({ delta: Number.NaN }).success).toBe(false);
    expect(adjustPantryStockSchema.safeParse({ delta: 100_000_000 }).success).toBe(false);
    expect(adjustPantryStockSchema.safeParse({ delta: -100_000_000 }).success).toBe(false);
    expect(adjustPantryStockSchema.safeParse({}).success).toBe(false);
  });

  it.each([0.01, -0.01, 1.15, -2.68, 99_999_999.99, -99_999_999.99])('acepta %d: hasta dos decimales', delta => {
    expect(adjustPantryStockSchema.safeParse({ delta }).success).toBe(true);
  });

  it.each([0.004, -0.004, 1.005, -0.125])('rechaza %d: más de dos decimales', delta => {
    expect(adjustPantryStockSchema.safeParse({ delta }).success).toBe(false);
  });

  it('rechaza campos que no son el ajuste', () => {
    expect(adjustPantryStockSchema.safeParse({ delta: 1, quantity: 5 }).success).toBe(false);
  });
});

describe('updatePantryProductSchema con código de barras', () => {
  it('permite quitar el código', () => {
    expect(updatePantryProductSchema.safeParse({ barcode: null }).success).toBe(true);
  });

  it('no permite asignar un código: se vincula solo al escanear', () => {
    expect(updatePantryProductSchema.safeParse({ barcode: EAN13 }).success).toBe(false);
  });
});

describe('rutas del código de barras', () => {
  it('arma las rutas de consulta, escaneo y ajuste de stock', () => {
    expect(API_PATHS.pantry.barcode(EAN13)).toBe(`/api/pantry/barcodes/${EAN13}`);
    expect(API_PATHS.pantry.productsScan).toBe('/api/pantry/products/scan');
    expect(API_PATHS.pantry.productStock('p1')).toBe('/api/pantry/products/p1/stock');
  });

  it('la consulta de un código no es una key de la alacena: un alta no la revalida', () => {
    expect(isPantryKey(API_PATHS.pantry.barcode(EAN13))).toBe(false);
  });
});
