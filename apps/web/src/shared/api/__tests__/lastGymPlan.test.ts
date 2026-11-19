import { beforeEach, describe, expect, it } from 'vitest';

import { clearLastGymPlan, readLastGymPlan, saveLastGymPlan } from '../lastGymPlan';

describe('lastGymPlan', () => {
  beforeEach(() => localStorage.clear());

  it('guarda el plan por persona', () => {
    saveLastGymPlan('ana', 'p1');
    saveLastGymPlan('leo', 'p2');

    expect(readLastGymPlan('ana')).toBe('p1');
    expect(readLastGymPlan('leo')).toBe('p2');
    expect(readLastGymPlan('otra')).toBeNull();
  });

  it('borrar solo borra el de esa persona', () => {
    saveLastGymPlan('ana', 'p1');
    saveLastGymPlan('leo', 'p2');

    clearLastGymPlan('ana');

    expect(readLastGymPlan('ana')).toBeNull();
    expect(readLastGymPlan('leo')).toBe('p2');
  });
});
