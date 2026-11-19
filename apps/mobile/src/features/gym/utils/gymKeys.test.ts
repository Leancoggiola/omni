import { API_KEYS } from '@/shared/api';

import { gymPlansKey, isGymKey } from './gymKeys';

describe('gymPlansKey', () => {
  it('pide de a 100, con estado y página opcionales y las claves ordenadas', () => {
    expect(gymPlansKey()).toBe(`${API_KEYS.gym.plans}?limit=100`);
    expect(gymPlansKey('ARCHIVED')).toBe(`${API_KEYS.gym.plans}?limit=100&status=ARCHIVED`);
    expect(gymPlansKey('ACTIVE', 2)).toBe(`${API_KEYS.gym.plans}?limit=100&page=2&status=ACTIVE`);
  });
});

describe('isGymKey', () => {
  it('reconoce planes, detalle, catálogo e historial', () => {
    expect(isGymKey(gymPlansKey())).toBe(true);
    expect(isGymKey(API_KEYS.gym.plan('p1'))).toBe(true);
    expect(isGymKey(`${API_KEYS.gym.catalog}?q=sen`)).toBe(true);
    expect(isGymKey(`${API_KEYS.gym.exerciseWeightHistory('e1')}?limit=5&page=1`)).toBe(true);
  });

  it('no toca keys de otros módulos ni las que no son strings', () => {
    expect(isGymKey(API_KEYS.pantry.products)).toBe(false);
    expect(isGymKey(['gym:last-plan', 'maria'])).toBe(false);
    expect(isGymKey(null)).toBe(false);
  });
});
