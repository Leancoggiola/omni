import { getTabBarStyle, TAB_BAR_CONTENT_HEIGHT } from './tabBarStyle';

describe('getTabBarStyle', () => {
  it('sin inset (gestos o iOS sin notch) deja el alto del contenido', () => {
    expect(getTabBarStyle(0)).toEqual({ height: TAB_BAR_CONTENT_HEIGHT });
  });

  it('suma el inset inferior (barra de 3 botones de Android) al alto de la tab bar', () => {
    expect(getTabBarStyle(48)).toEqual({ height: TAB_BAR_CONTENT_HEIGHT + 48 });
  });
});
