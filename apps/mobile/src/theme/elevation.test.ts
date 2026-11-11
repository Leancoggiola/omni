import { SHADOW_THEMED } from '@omni/shared/theme';

import { glassElevation, themedElevation } from './elevation';

describe('themedElevation', () => {
  it('da la sombra de cada esquema con el desplazamiento hacia arriba en la hoja', () => {
    expect(themedElevation('card', 'light')).toMatchObject({ shadowOffset: { width: 0, height: 8 }, shadowRadius: 32 });
    expect(themedElevation('card', 'dark').shadowOpacity).toBe(SHADOW_THEMED.card.dark.opacity);
    expect(themedElevation('sheet', 'light').shadowOffset.height).toBe(-12);
  });
});

describe('glassElevation', () => {
  it('es la misma sombra pero sin elevation de Android, que se vería a través del fondo translúcido', () => {
    expect(glassElevation('float', 'light')).toEqual({ ...themedElevation('float', 'light'), elevation: 0 });
    expect(themedElevation('float', 'light').elevation).toBeGreaterThan(0);
  });
});
