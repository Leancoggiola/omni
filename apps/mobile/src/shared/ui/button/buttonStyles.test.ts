import { withPress } from './buttonStyles';

describe('withPress', () => {
  it('con un color de press distinto arma la cláusula de Tamagui 3 sobre el base', () => {
    expect(withPress('background', 'background-press')).toBe('background press:background-press');
    expect(withPress('transparent', 'primarySurface')).toBe('transparent press:primarySurface');
  });

  it('con el mismo color en press devuelve solo el base, sin cláusula', () => {
    expect(withPress('dimmed', 'dimmed')).toBe('dimmed');
    expect(withPress('disabledSurface', 'disabledSurface')).toBe('disabledSurface');
  });
});
