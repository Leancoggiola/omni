import {
  formatExerciseCount,
  formatHistoryDate,
  formatPlanCounts,
  formatSetsReps,
  formatSetsRepsShort,
  formatWeight,
  formatWeightKg,
  weekdayShortLabel,
} from './gymFormat';

describe('formatWeight', () => {
  it.each([
    [60, '60'],
    [62.5, '62,5'],
    [57.25, '57,25'],
    [0, '0'],
    [1250, '1.250'],
    [0.1 + 0.2, '0,3'],
  ])('%s → %s', (value, expected) => {
    expect(formatWeight(value)).toBe(expected);
  });

  it('formatWeightKg suma la unidad', () => {
    expect(formatWeightKg(62.5)).toBe('62,5 kg');
  });
});

describe('formatSetsReps', () => {
  it('series y repeticiones contadas llevan la palabra', () => {
    expect(formatSetsReps(4, '12')).toBe('4 series · 12 repeticiones');
    expect(formatSetsReps(3, '8-12')).toBe('3 series · 8-12 repeticiones');
    expect(formatSetsReps(1, '1')).toBe('1 serie · 1 repetición');
  });

  it('las repeticiones que no son una cantidad van tal cual', () => {
    expect(formatSetsReps(3, 'AMRAP')).toBe('3 series · AMRAP');
    expect(formatSetsReps(3, '60s')).toBe('3 series · 60s');
  });

  it('sin series solo muestra las repeticiones', () => {
    expect(formatSetsReps(null, '60s')).toBe('60s');
    expect(formatSetsReps(null, '10')).toBe('10 repeticiones');
  });

  it('la forma corta es "series × repeticiones"', () => {
    expect(formatSetsRepsShort(4, '12')).toBe('4 × 12');
    expect(formatSetsRepsShort(null, '60s')).toBe('60s');
  });
});

describe('contadores', () => {
  it('días y ejercicios en singular y plural', () => {
    expect(formatPlanCounts(3, 8)).toBe('3 días · 8 ejercicios');
    expect(formatPlanCounts(1, 1)).toBe('1 día · 1 ejercicio');
    expect(formatPlanCounts(0, 0)).toBe('0 días · 0 ejercicios');
    expect(formatExerciseCount(2)).toBe('2 ejercicios');
  });
});

describe('formatHistoryDate', () => {
  it('día y mes en la zona de Argentina', () => {
    expect(formatHistoryDate('2026-11-12T15:00:00.000Z')).toBe('12/11');
    expect(formatHistoryDate('2026-09-30T12:00:00.000Z')).toBe('30/09');
  });

  it('de madrugada en UTC todavía es el día anterior en Argentina', () => {
    expect(formatHistoryDate('2026-11-13T02:00:00.000Z')).toBe('12/11');
  });
});

describe('weekdayShortLabel', () => {
  it('las tres primeras letras, con tilde', () => {
    expect(weekdayShortLabel('MONDAY')).toBe('Lun');
    expect(weekdayShortLabel('WEDNESDAY')).toBe('Mié');
    expect(weekdayShortLabel('SATURDAY')).toBe('Sáb');
  });
});
