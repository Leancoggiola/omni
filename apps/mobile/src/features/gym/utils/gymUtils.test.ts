import { day, exercise, planDetail, weightEntry } from '../fixtures';
import { deleteDayCopy, deletePlanCopy, removeExerciseCopy } from './gymMessages';
import { schemeChangeNotes } from './historyNotes';
import { parseWeightInput, weightInputError, weightInputText } from './weightInput';
import { weekdayOfDate } from './gymWeekday';

describe('weekdayOfDate', () => {
  it('pasa el getDay() (domingo = 0) a MONDAY…SUNDAY', () => {
    expect(weekdayOfDate(new Date(2026, 10, 15))).toBe('SUNDAY');
    expect(weekdayOfDate(new Date(2026, 10, 16))).toBe('MONDAY');
    expect(weekdayOfDate(new Date(2026, 10, 21))).toBe('SATURDAY');
  });
});

describe('peso escrito', () => {
  it('interpreta la coma decimal y redondea a 2 decimales', () => {
    expect(parseWeightInput('62,5')).toBe(62.5);
    expect(parseWeightInput('62.50')).toBe(62.5);
    expect(parseWeightInput('62.504')).toBeNull();
    expect(parseWeightInput('')).toBeNull();
    expect(parseWeightInput('abc')).toBeNull();
  });

  it('0 es válido; negativo, no numérico y pasado del máximo no', () => {
    expect(weightInputError('0')).toBeNull();
    expect(weightInputError('')).toBeNull();
    expect(weightInputError('-2,5')).toBe('El peso no puede ser negativo');
    expect(weightInputError('abc')).toBe('Ingresá un número');
    expect(weightInputError('0x1A')).toBe('Ingresá un número');
    expect(weightInputError('1e3')).toBe('Ingresá un número');
    expect(weightInputError('0,004')).toBe('Ingresá un número');
    expect(weightInputError('62,')).toBeNull();
    expect(weightInputError('1000000')).toBe('El peso máximo es 999.999,99 kg');
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
    const plan = planDetail({
      name: 'Fuerza',
      days: [day({ exercises: [exercise(), exercise({ id: 'e2' })] }), day({ id: 'd2', weekday: 'FRIDAY' })],
    });

    expect(deletePlanCopy(plan).description).toBe(
      'Se borran Fuerza, sus 2 días y 3 ejercicios. Los ejercicios que no uses en otro plan se borran con su peso y su historial. No se puede deshacer.'
    );
    expect(deletePlanCopy(planDetail({ name: 'Fuerza', days: [] })).description).toBe(
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

describe('weightInputText', () => {
  it('escribe el peso con coma y sin separador de miles, y se lee igual', () => {
    expect(weightInputText(62.5)).toBe('62,5');
    expect(weightInputText(60)).toBe('60');
    expect(weightInputText(1250.5)).toBe('1250,5');
    expect(parseWeightInput(weightInputText(1250.5))).toBe(1250.5);
  });
});
