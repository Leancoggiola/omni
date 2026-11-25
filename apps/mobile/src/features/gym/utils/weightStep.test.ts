import { AMOUNT_MAX_8_2 } from '@omni/shared/common';

import { stepWeight, WEIGHT_STEP_KG } from './weightStep';

describe('stepWeight', () => {
  it('suma y resta de a 2,5 kg sin arrastrar error de float', () => {
    expect(WEIGHT_STEP_KG).toBe(2.5);
    expect(stepWeight(60, WEIGHT_STEP_KG)).toBe(62.5);
    expect(stepWeight(0.1, 0.2)).toBe(0.3);
    expect(stepWeight(62.5, -WEIGHT_STEP_KG)).toBe(60);
  });

  it('no baja de 0 ni pasa la cota de la API', () => {
    expect(stepWeight(1, -WEIGHT_STEP_KG)).toBe(0);
    expect(stepWeight(AMOUNT_MAX_8_2, WEIGHT_STEP_KG)).toBe(AMOUNT_MAX_8_2);
  });
});
