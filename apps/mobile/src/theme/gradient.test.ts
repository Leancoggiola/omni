import { transparentOf } from './gradient';

describe('transparentOf', () => {
  it('agrega alfa 0 a un #rrggbb', () => {
    expect(transparentOf('#c4622d')).toBe('#c4622d00');
  });

  it('reemplaza el alfa de un #rrggbbaa', () => {
    expect(transparentOf('#C4622D80')).toBe('#C4622D00');
  });

  it.each(['transparent', '#fff', '#c4622', 'rgb(0, 0, 0)', 'c4622d', '#c4622d0', '#zzzzzz'])('rechaza %p', color => {
    expect(() => transparentOf(color)).toThrow(/#rrggbb o #rrggbbaa/);
  });
});
