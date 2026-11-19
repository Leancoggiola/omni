import { resolvePlanId } from './resolvePlanId';

import type { GymPlanSummary } from '@omni/shared/gym';

const summary = (id: string): GymPlanSummary => ({
  id,
  name: id,
  status: 'ACTIVE',
  createdAt: '2026-11-01T00:00:00.000Z',
  archivedAt: null,
  dayCount: 0,
  exerciseCount: 0,
});

describe('resolvePlanId', () => {
  it('espera el guardado y la lista', () => {
    expect(resolvePlanId(undefined, [summary('a')])).toBeUndefined();
    expect(resolvePlanId('a', undefined)).toBeUndefined();
  });

  it('usa el último elegido si sigue existiendo', () => {
    expect(resolvePlanId('b', [summary('a'), summary('b')])).toBe('b');
  });

  it('sin guardado, o si ya no existe, cae al primero de la lista', () => {
    expect(resolvePlanId(null, [summary('a'), summary('b')])).toBe('a');
    expect(resolvePlanId('borrado', [summary('a')])).toBe('a');
  });

  it('sin planes es null', () => {
    expect(resolvePlanId(null, [])).toBeNull();
    expect(resolvePlanId('a', [])).toBeNull();
  });
});
