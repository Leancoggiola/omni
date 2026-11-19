import { describe, expect, it } from 'vitest';

import { SWR_KEYS } from '@/shared/api';

import {
  exerciseFieldsSchema,
  exerciseFormSchema,
  toAddExercisePayload,
  toEditExercisePayload,
} from '../utils/exerciseForm';
import { isGymKey, withExerciseWeight } from '../utils/gymCache';
import { formatHistoryDate, formatSetsAndReps, formatVariantShort, formatWeightKg } from '../utils/gymFormat';
import { schemeChangeNotes } from '../utils/gymHistory';
import { deleteDayCopy, deletePlanCopy, removeExerciseCopy } from '../utils/gymMessages';
import { moveItem } from '../utils/gymOrder';
import { getPlanStats } from '../utils/gymPlanStats';
import { findMatchingVariant } from '../utils/gymVariant';
import { weekdayOfDate } from '../utils/gymWeekday';
import { parseWeight, stepWeight, WEIGHT_MAX_KG, weightError } from '../utils/gymWeight';
import { catalogExercise, day, exercise, planDetail, planSummary, weightEntry } from './fixtures';

describe('formato del gimnasio', () => {
  it('muestra el peso con coma decimal y sin ceros de más', () => {
    expect(formatWeightKg(60)).toBe('60 kg');
    expect(formatWeightKg(57.5)).toBe('57,5 kg');
    expect(formatWeightKg(1250.25)).toBe('1.250,25 kg');
  });

  it('arma series y repeticiones como en las filas del día', () => {
    expect(formatSetsAndReps(4, '12')).toBe('4 series · 12 repeticiones');
    expect(formatSetsAndReps(3, '8-12')).toBe('3 series · 8-12 repeticiones');
    expect(formatSetsAndReps(3, 'AMRAP')).toBe('3 series · AMRAP');
    expect(formatSetsAndReps(3, '60 s')).toBe('3 series · 60 s');
    expect(formatSetsAndReps(1, '1')).toBe('1 serie · 1 repetición');
    expect(formatSetsAndReps(null, '60 s')).toBe('60 s');
  });

  it('la forma corta de la variante es "series × repeticiones"', () => {
    expect(formatVariantShort(4, '12')).toBe('4 × 12');
    expect(formatVariantShort(null, '60 s')).toBe('60 s');
  });

  it('la fecha del historial lleva el año solo si no es el actual', () => {
    const now = new Date(2026, 10, 20);
    expect(formatHistoryDate('2026-11-12T15:00:00.000Z', now)).toBe('12/11');
    expect(formatHistoryDate('2025-09-30T15:00:00.000Z', now)).toBe('30/09/25');
  });
});

describe('stepWeight', () => {
  it('suma y resta de a 2,5 kg sin bajar de 0 ni pasar el máximo', () => {
    expect(stepWeight(60, 1)).toBe(62.5);
    expect(stepWeight(0, 1)).toBe(2.5);
    expect(stepWeight(1, -1)).toBe(0);
    expect(stepWeight(WEIGHT_MAX_KG, 1)).toBe(WEIGHT_MAX_KG);
  });

  it('redondea a 2 decimales', () => {
    expect(stepWeight(0.1 + 0.2, 1)).toBe(2.8);
  });
});

describe('findMatchingVariant', () => {
  const catalog = [catalogExercise(), catalogExercise({ id: 'c2', sets: 3, reps: '8', currentWeightKg: 70 })];

  it('encuentra la variante con la misma regla que la API (mayúsculas, bordes y espacios de las repeticiones)', () => {
    expect(findMatchingVariant(catalog, { name: '  SENTADILLA ', sets: 3, reps: ' 8 ' })?.id).toBe('c2');
    expect(
      findMatchingVariant([catalogExercise({ reps: '8-12' })], { name: 'sentadilla', sets: 4, reps: '8 - 12' })?.id
    ).toBe('c1');
  });

  it('"sin series" es otra variante', () => {
    expect(findMatchingVariant(catalog, { name: 'Sentadilla', sets: null, reps: '12' })).toBeUndefined();
  });

  it('sin nombre o sin repeticiones no coincide con nada', () => {
    expect(findMatchingVariant(catalog, { name: '', sets: 4, reps: '12' })).toBeUndefined();
    expect(findMatchingVariant(catalog, { name: 'Sentadilla', sets: 4, reps: '  ' })).toBeUndefined();
  });
});

describe('caché del gimnasio', () => {
  it('isGymKey reconoce planes, catálogo e historiales, y nada más', () => {
    expect(isGymKey(`${SWR_KEYS.gym.plans}?limit=100`)).toBe(true);
    expect(isGymKey(SWR_KEYS.gym.plan('p1'))).toBe(true);
    expect(isGymKey(`${SWR_KEYS.gym.catalog}?q=sen`)).toBe(true);
    expect(isGymKey(`${SWR_KEYS.gym.exerciseWeightHistory('e1')}?page=1`)).toBe(true);
    expect(isGymKey(SWR_KEYS.pantry.summary)).toBe(false);
    expect(isGymKey(42)).toBe(false);
  });

  it('withExerciseWeight actualiza todas las filas de la misma variante', () => {
    const plan = planDetail({
      days: [
        day({ exercises: [exercise(), exercise({ id: 'e2', catalogId: 'c2', currentWeightKg: 40 })] }),
        day({ id: 'd2', weekday: 'FRIDAY', exercises: [exercise({ id: 'e3' })] }),
      ],
    });

    const next = withExerciseWeight(plan, exercise({ currentWeightKg: 62.5 }));

    expect(next.days[0]!.exercises.map(e => e.currentWeightKg)).toEqual([62.5, 40]);
    expect(next.days[1]!.exercises[0]!.currentWeightKg).toBe(62.5);
  });
});

describe('getPlanStats', () => {
  it('cuenta días, filas y filas sin peso', () => {
    const plan = planDetail({
      days: [
        day({ exercises: [exercise(), exercise({ id: 'e2', currentWeightKg: null })] }),
        day({ id: 'd2', weekday: 'WEDNESDAY', exercises: [exercise({ id: 'e3', currentWeightKg: null })] }),
      ],
    });

    expect(getPlanStats(plan)).toEqual({ dayCount: 2, exerciseCount: 3, withoutWeightCount: 2 });
  });
});

describe('formulario de ejercicio', () => {
  it('sin series manda null y recorta nombre y repeticiones', () => {
    expect(toAddExercisePayload('p1', { weekday: 'MONDAY', name: ' Plancha ', sets: '', reps: ' 60 s ' })).toEqual({
      planId: 'p1',
      weekday: 'MONDAY',
      name: 'Plancha',
      sets: null,
      reps: '60 s',
    });
  });

  it('pide nombre y repeticiones, y series enteras positivas', () => {
    const result = exerciseFormSchema.safeParse({ weekday: 'MONDAY', name: ' ', sets: 0, reps: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map(issue => [issue.path[0], issue.message])).toEqual([
      ['name', 'Ponele un nombre al ejercicio'],
      ['sets', 'Ingresá un número entero entre 1 y 1000'],
      ['reps', 'Ingresá las repeticiones'],
    ]);
  });
});

describe('formulario de editar', () => {
  it('manda solo nombre, series y repeticiones, con las series vacías como null', () => {
    expect(toEditExercisePayload({ name: ' Sentadilla ', sets: '', reps: ' 12 ' })).toEqual({
      name: 'Sentadilla',
      sets: null,
      reps: '12',
    });
  });

  it('las series tienen que ser un entero de 1 a 1000 o estar vacías', () => {
    const parse = (sets: number | string) => exerciseFieldsSchema.safeParse({ name: 'A', sets, reps: '1' }).success;
    expect(parse('')).toBe(true);
    expect(parse(1000)).toBe(true);
    expect(parse(1001)).toBe(false);
    expect(parse(2.5)).toBe(false);
    expect(parse(0)).toBe(false);
  });
});

describe('peso', () => {
  it('0 es válido, el negativo y el que pasa el máximo no', () => {
    expect(weightError(0)).toBeNull();
    expect(weightError('')).toBeNull();
    expect(weightError(-2.5)).toBe('El peso no puede ser negativo');
    expect(weightError(1_000_000)).toBe('El peso máximo es 999.999,99 kg');
    expect(weightError('-')).toBe('Ingresá un número');
  });

  it('interpreta la coma decimal y redondea a 2 decimales', () => {
    expect(parseWeight('62,5')).toBe(62.5);
    expect(parseWeight(62.504)).toBe(62.5);
    expect(parseWeight('')).toBeNull();
  });
});

describe('día de hoy', () => {
  it('pasa el getDay() (domingo = 0) a MONDAY…SUNDAY', () => {
    expect(weekdayOfDate(new Date(2026, 10, 15))).toBe('SUNDAY');
    expect(weekdayOfDate(new Date(2026, 10, 16))).toBe('MONDAY');
    expect(weekdayOfDate(new Date(2026, 10, 21))).toBe('SATURDAY');
  });
});

describe('moveItem', () => {
  it('mueve un elemento sin tocar el original', () => {
    const items = ['a', 'b', 'c'];
    expect(moveItem(items, 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(items, 0, 1)).toEqual(['b', 'a', 'c']);
    expect(items).toEqual(['a', 'b', 'c']);
  });
});

describe('schemeChangeNotes', () => {
  const entry = (id: string, weightKg: number, sets: number | null, reps: string) =>
    weightEntry({ id, weightKg, sets, reps });

  it('aclara cuando el peso no cambió pero sí el esquema, con el de la entrada más vieja', () => {
    const notes = schemeChangeNotes([entry('a', 60, 4, '12'), entry('b', 55, 4, '12'), entry('c', 55, 3, '12')]);
    expect(notes.get('b')).toBe('Cambiaron las series o repeticiones (antes 3 × 12)');
    expect(notes.has('a')).toBe(false);
    expect(notes.has('c')).toBe(false);
  });

  it('no aclara si cambió el peso o si el esquema es el mismo', () => {
    expect(schemeChangeNotes([entry('a', 60, 3, '12'), entry('b', 55, 4, '12')]).size).toBe(0);
    expect(schemeChangeNotes([entry('a', 55, 4, '12'), entry('b', 55, 4, '12')]).size).toBe(0);
  });
});

describe('textos de confirmación', () => {
  it('borrar un plan cuenta días y ejercicios, y el vacío lo dice', () => {
    expect(deletePlanCopy(planSummary({ name: 'Fuerza', dayCount: 3, exerciseCount: 8 })).description).toBe(
      'Se borran Fuerza, sus 3 días y 8 ejercicios. Los ejercicios que no uses en otro plan se borran con su peso y su historial. No se puede deshacer.'
    );
    expect(deletePlanCopy(planSummary({ name: 'Fuerza', dayCount: 0, exerciseCount: 0 })).description).toBe(
      'Se borra Fuerza, que no tiene ejercicios. No se puede deshacer.'
    );
  });

  it('quitar avisa del peso, y si la variante sigue en otro día se conserva', () => {
    const lunes = day({
      exercises: [exercise(), exercise({ id: 'e2', catalogId: 'c2', name: 'Remo', currentWeightKg: 35 })],
    });
    const viernes = day({ id: 'd2', weekday: 'FRIDAY', exercises: [exercise({ id: 'e3' })] });
    const plan = planDetail({ days: [lunes, viernes] });

    expect(removeExerciseCopy(plan, lunes, lunes.exercises[1]!).description).toBe(
      'Se quita solo de este día. Si no lo usás en otro día ni en otro plan, también se borran su peso (35 kg) y su historial.'
    );
    expect(removeExerciseCopy(plan, lunes, lunes.exercises[0]!).description).toBe(
      'Se quita solo de este día. Sentadilla 4 × 12 también está en el viernes: su peso y su historial se conservan.'
    );
  });

  it('si era el último del día avisa que el día también se borra', () => {
    const solo = day({ exercises: [exercise({ currentWeightKg: null })] });
    const { description } = removeExerciseCopy(planDetail({ days: [solo] }), solo, solo.exercises[0]!);
    expect(description).toContain('Es el último del lunes: el día también se borra.');
    expect(description).not.toContain('(');
  });

  it('borrar un día dice cuántos ejercicios se van', () => {
    expect(deleteDayCopy(day({ exercises: [exercise(), exercise({ id: 'e2' })] }))).toEqual({
      title: '¿Borrar el lunes?',
      description:
        'Se borran sus 2 ejercicios de este plan. Los que no uses en otro día ni en otro plan se borran con su peso y su historial.',
    });
  });
});
