import { parseAmountInput, parseQuickExpense, splitQuickInput } from './quickExpense';

describe('parseAmountInput', () => {
  it.each([
    ['27000', 27000],
    ['27.000', 27000],
    ['27.000,50', 27000.5],
    ['27000,5', 27000.5],
    ['27000.50', 27000.5],
    ['$ 1.234.567', 1234567],
    ['$90', 90],
  ])('"%s" es %d', (text, amount) => {
    expect(parseAmountInput(text)).toBe(amount);
  });

  it.each(['', '0', '-5', 'abc', '1,234', '12.34.5', '27 000', '99999999999'])('rechaza "%s"', text => {
    expect(parseAmountInput(text)).toBeNull();
  });
});

describe('splitQuickInput', () => {
  it('separa el monto del principio del detalle', () => {
    expect(splitQuickInput('  $ 27.000  Bebidas y hielo ')).toEqual({
      amount: '27.000',
      description: 'Bebidas y hielo',
    });
  });

  it('sin un número adelante todo es detalle', () => {
    expect(splitQuickInput('Bebidas 27000')).toEqual({ amount: '', description: 'Bebidas 27000' });
  });
});

describe('parseQuickExpense', () => {
  it('toma el número inicial como monto y el resto como detalle', () => {
    expect(parseQuickExpense('27000 Bebidas')).toEqual({ amount: 27000, description: 'Bebidas' });
  });

  it('el detalle es opcional', () => {
    expect(parseQuickExpense('1.500,50')).toEqual({ amount: 1500.5, description: null });
  });

  it('recorta el detalle al largo que admite la API', () => {
    expect(parseQuickExpense(`10 ${'a'.repeat(250)}`)?.description).toHaveLength(200);
  });

  it.each(['Bebidas', '27000Bebidas', '0 Bebidas', ''])('"%s" no es un gasto', text => {
    expect(parseQuickExpense(text)).toBeNull();
  });
});
