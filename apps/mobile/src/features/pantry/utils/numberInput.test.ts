import { parseNumberInput } from './numberInput';

describe('parseNumberInput', () => {
  it('acepta coma decimal y deja vacío lo vacío', () => {
    expect(parseNumberInput('1,5')).toBe(1.5);
    expect(parseNumberInput(' 3 ')).toBe(3);
    expect(parseNumberInput('')).toBe('');
    expect(parseNumberInput('abc')).toBeNaN();
  });
});
