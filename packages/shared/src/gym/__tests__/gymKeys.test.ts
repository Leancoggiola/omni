import { describe, expect, it } from 'vitest';

import { API_PATHS } from '../../api';
import { GYM_PLANS_PAGE_LIMIT, gymPlansKey, isGymKey } from '..';

describe('gymPlansKey', () => {
  it('pide de a GYM_PLANS_PAGE_LIMIT, con o sin estado y página', () => {
    expect(gymPlansKey()).toBe(`${API_PATHS.gym.plans}?limit=${GYM_PLANS_PAGE_LIMIT}`);
    expect(gymPlansKey('ARCHIVED')).toBe(`${API_PATHS.gym.plans}?limit=100&status=ARCHIVED`);
    expect(gymPlansKey('ACTIVE', 2)).toBe(`${API_PATHS.gym.plans}?limit=100&page=2&status=ACTIVE`);
    expect(gymPlansKey(undefined, 3)).toBe(`${API_PATHS.gym.plans}?limit=100&page=3`);
  });

  it('acepta otro tamaño de página', () => {
    expect(gymPlansKey('ACTIVE', 1, 50)).toBe(`${API_PATHS.gym.plans}?limit=50&page=1&status=ACTIVE`);
  });
});

describe('isGymKey', () => {
  it('reconoce planes, catálogo e historiales', () => {
    expect(isGymKey(gymPlansKey())).toBe(true);
    expect(isGymKey(API_PATHS.gym.plan('p1'))).toBe(true);
    expect(isGymKey(`${API_PATHS.gym.catalog}?q=sen`)).toBe(true);
    expect(isGymKey(`${API_PATHS.gym.exerciseWeightHistory('e1')}?limit=5&page=1`)).toBe(true);
  });

  it('descarta lo que no es del gimnasio y las keys que no son texto', () => {
    expect(isGymKey(API_PATHS.pantry.summary)).toBe(false);
    expect(isGymKey(['gym:last-plan', 'maria'])).toBe(false);
    expect(isGymKey(42)).toBe(false);
    expect(isGymKey(null)).toBe(false);
  });
});
