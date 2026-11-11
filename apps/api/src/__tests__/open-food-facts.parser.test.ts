import { describe, expect, it } from 'vitest';

import {
  buildCatalogProduct,
  composeProductName,
  mapPantryCategory,
  parsePackageSize,
} from '../pantry/open-food-facts.parser';

describe('parsePackageSize', () => {
  it.each([
    ['500 gr', '500 g'],
    ['500g', '500 g'],
    ['1 kg', '1 kg'],
    ['1 Kilo', '1 kg'],
    ['1.5lts', '1,5 L'],
    ['2,25 L', '2,25 L'],
    ['1 Litro', '1 L'],
    ['900 ML', '900 ml'],
    ['354 cc', '354 ml'],
    ['200 cm3', '200 ml'],
    ['1.000 ml', '1000 ml'],
    ['1.5 kg', '1,5 kg'],
    ['400 g (14 oz)', '400 g'],
    ['  250   g ', '250 g'],
  ])('lleva "%s" a "%s"', (quantity, expected) => {
    expect(parsePackageSize(quantity)).toBe(expected);
  });

  it.each([
    ['un multipack', '6 x 250 ml'],
    ['un multipack con la cantidad al final', '250 ml x 6'],
    ['un multipack sin espacios', '250ml x6'],
    ['un multipack con el signo de multiplicar', '250 ml × 6'],
    ['un número sin unidad', '500'],
    ['una unidad que no es de peso ni volumen', '12 unidades'],
    ['una unidad pegada a otra palabra', '3 latas'],
    ['una cantidad en cero', '0 g'],
    ['un texto libre', 'paquete familiar'],
    ['un texto vacío', ''],
  ])('devuelve null con %s', (_case, quantity) => {
    expect(parsePackageSize(quantity)).toBeNull();
  });

  it('devuelve null sin cantidad', () => {
    expect(parsePackageSize(null)).toBeNull();
    expect(parsePackageSize(undefined)).toBeNull();
  });
});

describe('mapPantryCategory', () => {
  it.each([
    [['en:dairies', 'en:milks'], 'DAIRY'],
    [['en:beverages', 'en:sodas'], 'BEVERAGES'],
    [['en:snacks', 'en:sweet-snacks', 'en:biscuits'], 'SNACKS'],
    [['en:meats-and-their-products', 'en:prepared-meats'], 'MEAT'],
    [['en:seafood', 'en:fishes'], 'MEAT'],
    [['en:cereals-and-potatoes', 'en:pastas'], 'GRAINS'],
    [['en:condiments', 'en:sauces'], 'CONDIMENTS'],
    [['en:fruits'], 'FRUIT'],
    [['en:canned-vegetables'], 'VEGETABLE'],
    [['en:plant-based-foods', 'en:vegetables-based-foods'], 'VEGETABLE'],
    [['en:cleaning-products'], 'CLEANING'],
  ])('mapea las etiquetas %j a %s', (tags, category) => {
    expect(mapPantryCategory(tags, 'Producto')).toBe(category);
  });

  it('un helado es congelado antes que lácteo', () => {
    expect(mapPantryCategory(['en:dairies', 'en:frozen-foods', 'en:ice-creams'], 'Helado')).toBe('FROZEN');
  });

  it('una leche chocolatada es lácteo antes que bebida', () => {
    expect(mapPantryCategory(['en:beverages', 'en:dairies', 'en:milks'], 'Leche chocolatada')).toBe('DAIRY');
  });

  it('el dulce de leche no cuenta como lácteo por sus etiquetas', () => {
    const tags = ['en:dairies', 'en:spreads', 'en:sweet-spreads', 'es:dulces-de-leche'];

    expect(mapPantryCategory(tags, 'Dulce de leche clásico')).toBeNull();
  });

  it('las etiquetas pesan más que el nombre', () => {
    expect(mapPantryCategory(['en:snacks'], 'Leche')).toBe('SNACKS');
  });

  it('con etiquetas que no alcanzan busca por el nombre', () => {
    expect(mapPantryCategory(['en:plant-based-foods-and-beverages'], 'Yerba mate suave')).toBe('BEVERAGES');
  });

  it.each([
    ['Leche entera', 'DAIRY'],
    ['Yogur bebible de frutilla', 'DAIRY'],
    ['Quesos surtidos', 'DAIRY'],
    ['Chocolate con leche', 'SNACKS'],
    ['Galletitas de agua', 'SNACKS'],
    ['Alfajores de chocolate', 'SNACKS'],
    ['Café con leche', 'BEVERAGES'],
    ['Té verde', 'BEVERAGES'],
    ['Jugo en polvo', 'BEVERAGES'],
    ['Aceite de girasol', 'CONDIMENTS'],
    ['Azúcar común', 'CONDIMENTS'],
    ['Harina de arroz', 'GRAINS'],
    ['Fideos tirabuzón', 'GRAINS'],
    ['Jabón en polvo', 'CLEANING'],
    ['LAVANDINA en gel', 'CLEANING'],
  ])('sin etiquetas, "%s" es %s', (name, category) => {
    expect(mapPantryCategory([], name)).toBe(category);
  });

  it.each([
    ['Dulce de leche'],
    ['Atún al agua'],
    ['Mate cocido'],
    ['Lentejas secas'],
    ['Tomate triturado'],
    ['Aguardiente'],
  ])('sin etiquetas, "%s" queda sin categoría', name => {
    expect(mapPantryCategory([], name)).toBeNull();
  });
});

describe('composeProductName', () => {
  it('suma la marca y el tamaño al nombre', () => {
    expect(composeProductName('Leche entera', 'La Serenísima', '1 L')).toBe('Leche entera La Serenísima 1 L');
  });

  it('no repite la marca que el nombre ya dice, aunque esté escrita distinto', () => {
    expect(composeProductName('Coca Cola Original', 'Coca-Cola', '2,25 L')).toBe('Coca Cola Original 2,25 L');
    expect(composeProductName('Yerba PLAYADITO', 'Playadito', null)).toBe('Yerba PLAYADITO');
  });

  it('no repite el tamaño que el nombre ya dice', () => {
    expect(composeProductName('Arroz largo fino 1 kg', 'Gallo', '1 kg')).toBe('Arroz largo fino 1 kg Gallo');
  });

  it('sin marca ni tamaño devuelve el nombre', () => {
    expect(composeProductName('Fideos', null, null)).toBe('Fideos');
  });

  it('resigna primero el tamaño y después la marca para entrar en 120 caracteres', () => {
    const name = 'a'.repeat(112);

    expect(composeProductName(name, 'Marca', '500 g')).toBe(`${name} Marca`);
    expect(composeProductName('a'.repeat(118), 'Marca', '500 g')).toBe('a'.repeat(118));
  });

  it('recorta un nombre que ya viene más largo que el máximo', () => {
    expect(composeProductName('a'.repeat(130), 'Marca', '500 g')).toBe('a'.repeat(120));
  });
});

describe('buildCatalogProduct', () => {
  it('arma el producto con nombre, marca, tamaño y categoría', () => {
    const product = buildCatalogProduct({
      names: ['Coca Cola Original', 'Coca-Cola'],
      brands: 'Coca-Cola, The Coca-Cola Company',
      quantity: '2,25 L',
      categoriesTags: ['en:beverages', 'en:carbonated-drinks', 'en:sodas'],
    });

    expect(product).toEqual({
      name: 'Coca Cola Original',
      brand: 'Coca-Cola',
      packageSize: '2,25 L',
      category: 'BEVERAGES',
    });
  });

  it('usa el primer nombre que tenga texto', () => {
    expect(buildCatalogProduct({ names: ['   ', null, 'Whole milk'] })?.name).toBe('Whole milk');
  });

  it('colapsa los espacios del nombre y de la marca', () => {
    const product = buildCatalogProduct({ names: ['  Galletitas   de  agua '], brands: '  Traviata  ,Bagley' });

    expect(product).toMatchObject({ name: 'Galletitas de agua', brand: 'Traviata', category: 'SNACKS' });
  });

  it('deja en null lo que el catálogo no informa', () => {
    expect(buildCatalogProduct({ names: ['Producto misterioso'], brands: ' ', quantity: null })).toEqual({
      name: 'Producto misterioso',
      brand: null,
      packageSize: null,
      category: null,
    });
  });

  it('recorta nombres y marcas a los largos que acepta la alacena', () => {
    const product = buildCatalogProduct({ names: ['n'.repeat(200)], brands: 'm'.repeat(90) });

    expect(product?.name).toHaveLength(120);
    expect(product?.brand).toHaveLength(60);
  });

  it('devuelve null si ningún nombre tiene texto', () => {
    expect(buildCatalogProduct({ names: [null, undefined, '  '], brands: 'Marca' })).toBeNull();
    expect(buildCatalogProduct({ names: [] })).toBeNull();
  });
});
