import { SHADOW_THEMED } from '@omni/shared/theme';

import { themedElevation } from './elevation';

describe('themedElevation', () => {
  it('da la sombra de cada esquema con el desplazamiento hacia arriba en la hoja', () => {
    expect(themedElevation('card', 'light')).toMatchObject({ shadowOffset: { width: 0, height: 8 }, shadowRadius: 32 });
    expect(themedElevation('card', 'dark').shadowOpacity).toBe(SHADOW_THEMED.card.dark.opacity);
    expect(themedElevation('sheet', 'light').shadowOffset.height).toBe(-12);
  });
});
