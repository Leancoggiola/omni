import { findSameVariant, isSameVariant, parseSetsInput } from './exerciseForm';

import type { GymCatalogExercise } from '@omni/shared/gym';

const catalog: GymCatalogExercise[] = [
  { id: 'c1', name: 'Sentadilla', sets: 4, reps: '12', currentWeightKg: 60 },
  { id: 'c2', name: 'Sentadilla', sets: 3, reps: '8', currentWeightKg: 70 },
  { id: 'c3', name: 'Plancha', sets: null, reps: '60s', currentWeightKg: null },
];

describe('isSameVariant', () => {
  it('compara el nombre sin mayúsculas ni espacios en los bordes y las repeticiones sin espacios', () => {
    expect(isSameVariant({ name: '  SENTADILLA ', sets: 4, reps: '12' }, catalog[0]!)).toBe(true);
    expect(isSameVariant({ name: 'Curl', sets: 3, reps: '8 - 12' }, { name: 'curl', sets: 3, reps: '8-12' })).toBe(
      true
    );
    expect(
      isSameVariant({ name: 'Dominadas', sets: 3, reps: 'amrap' }, { name: 'Dominadas', sets: 3, reps: 'AMRAP' })
    ).toBe(true);
  });

  it('series distintas, o con y sin series, son otra variante', () => {
    expect(isSameVariant({ name: 'Sentadilla', sets: 3, reps: '12' }, catalog[0]!)).toBe(false);
    expect(isSameVariant({ name: 'Plancha', sets: 3, reps: '60s' }, catalog[2]!)).toBe(false);
  });
});

describe('findSameVariant', () => {
  it('devuelve la variante exacta o undefined', () => {
    expect(findSameVariant(catalog, { name: 'sentadilla', sets: 3, reps: '8' })?.id).toBe('c2');
    expect(findSameVariant(catalog, { name: 'Plancha', sets: null, reps: '60S' })?.id).toBe('c3');
    expect(findSameVariant(catalog, { name: 'Sentadilla', sets: 5, reps: '5' })).toBeUndefined();
  });
});

describe('parseSetsInput', () => {
  it('vacío es sin series', () => {
    expect(parseSetsInput('')).toBeNull();
    expect(parseSetsInput('  ')).toBeNull();
  });

  it('un entero positivo dentro de la cota es el número', () => {
    expect(parseSetsInput('4')).toBe(4);
    expect(parseSetsInput(' 12 ')).toBe(12);
  });

  it('cero, decimales, negativos, letras o más que la cota son inválidos', () => {
    expect(parseSetsInput('0')).toBeUndefined();
    expect(parseSetsInput('2.5')).toBeUndefined();
    expect(parseSetsInput('-1')).toBeUndefined();
    expect(parseSetsInput('tres')).toBeUndefined();
    expect(parseSetsInput('1001')).toBeUndefined();
  });
});
