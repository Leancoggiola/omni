import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { actionSheet } from '@/shared/ui/actionSheet/actionSheet';

import { exercise } from '../fixtures';
import { ChangeDaySheet } from './ChangeDaySheet';
import { EditExerciseSheet } from './EditExerciseSheet';
import { MoveExerciseSheet } from './MoveExerciseSheet';
import { PlanNameSheet } from './PlanNameSheet';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/shared/ui/actionSheet/actionSheet', () => ({ actionSheet: jest.fn() }));

const done = { status: 'done' } as const;
const conflict = (message: string) => ({ status: 'error', message, conflict: true }) as const;

beforeEach(() => jest.clearAllMocks());

describe('EditExerciseSheet', () => {
  async function renderEdit(onSubmit = jest.fn().mockResolvedValue(done), currentWeightKg: number | null = 60) {
    const onOpenChange = jest.fn();
    await render(
      <EditExerciseSheet
        open
        onOpenChange={onOpenChange}
        exercise={exercise({ currentWeightKg })}
        onSubmit={onSubmit}
      />
    );
    return { onSubmit, onOpenChange };
  }

  const save = () => screen.getByRole('button', { name: 'Guardar cambios' });

  it('avisa que cambia en todos los planes y, con peso, que se suma un registro al historial', async () => {
    await renderEdit();

    expect(
      screen.getByText(/Se cambia en todos tus planes que usan este ejercicio, también en los archivados\./)
    ).toBeTruthy();
    expect(screen.getByText(/Como tiene 60 kg cargados/)).toBeTruthy();
  });

  it('sin peso no habla del historial', async () => {
    await renderEdit(undefined, null);

    expect(screen.queryByText(/Como tiene/)).toBeNull();
  });

  it('Guardar arranca deshabilitado y manda solo nombre, series y repeticiones', async () => {
    const { onSubmit } = await renderEdit();
    expect(save().props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByLabelText('Repeticiones, obligatorio'), '10');
    await fireEvent.press(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Sentadilla', sets: 4, reps: '10' }));
  });

  it('series vacías se mandan como null', async () => {
    const { onSubmit } = await renderEdit();

    await fireEvent.changeText(screen.getByLabelText('Series'), '');
    await fireEvent.press(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ sets: null })));
  });

  it('valida con los textos del canvas', async () => {
    const { onSubmit } = await renderEdit();

    await fireEvent.changeText(screen.getByLabelText('Nombre, obligatorio'), '  ');
    await fireEvent.press(save());

    expect(screen.getByText('Ponele un nombre al ejercicio')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('un 409 queda como aviso en la hoja con la ayuda del cliente y la hoja sigue abierta', async () => {
    const onSubmit = jest
      .fn()
      .mockResolvedValue(conflict('Ya existe un ejercicio con ese nombre, series y repeticiones'));
    const { onOpenChange } = await renderEdit(onSubmit);
    await fireEvent.changeText(screen.getByLabelText('Nombre, obligatorio'), 'Sentadilla frontal');

    await fireEvent.press(save());

    expect(await screen.findByText(/Ya existe un ejercicio con ese nombre, series y repeticiones/)).toBeTruthy();
    expect(screen.getByText(/Cambiá algún dato: los ejercicios no se fusionan\./)).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe('MoveExerciseSheet', () => {
  async function renderMove(onSubmit = jest.fn().mockResolvedValue(done)) {
    const onOpenChange = jest.fn();
    await render(
      <MoveExerciseSheet
        open
        onOpenChange={onOpenChange}
        exerciseName="Sentadilla"
        weekday="MONDAY"
        occupiedWeekdays={['MONDAY', 'FRIDAY']}
        onSubmit={onSubmit}
      />
    );
    return { onSubmit, onOpenChange };
  }

  it('no ofrece el día de origen y deshabilita los días donde la variante ya está', async () => {
    jest.mocked(actionSheet).mockResolvedValue(null);
    await renderMove();

    await fireEvent.press(screen.getByRole('button', { name: /^Mover a/ }));

    const { options } = jest.mocked(actionSheet).mock.calls[0]![0];
    expect(options.map(option => option.value)).not.toContain('MONDAY');
    expect(options.find(option => option.value === 'FRIDAY')).toMatchObject({
      label: 'Viernes · ya lo tiene',
      disabled: true,
    });
    expect(options.find(option => option.value === 'TUESDAY')?.disabled).toBe(false);
  });

  it('arranca en el primer día libre y manda solo el día elegido', async () => {
    jest.mocked(actionSheet).mockResolvedValue('SATURDAY');
    const { onSubmit } = await renderMove();
    expect(screen.getByRole('button', { name: 'Mover a: Martes' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /^Mover a/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Mover ejercicio' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('SATURDAY'));
  });

  it('si todos los días libres están ocupados Mover queda deshabilitado', async () => {
    await render(
      <MoveExerciseSheet
        open
        onOpenChange={jest.fn()}
        exerciseName="Sentadilla"
        weekday="MONDAY"
        occupiedWeekdays={['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Mover ejercicio' }).props.accessibilityState.disabled).toBe(true);
  });

  it('un 409 queda como aviso en la hoja con "Elegí otro día."', async () => {
    await renderMove(jest.fn().mockResolvedValue(conflict('El ejercicio ya está en ese día')));

    await fireEvent.press(screen.getByRole('button', { name: 'Mover ejercicio' }));

    expect(await screen.findByText(/El ejercicio ya está en ese día/)).toBeTruthy();
    expect(screen.getByText(/Elegí otro día\./)).toBeTruthy();
  });
});

describe('ChangeDaySheet', () => {
  async function renderChange(onSubmit = jest.fn().mockResolvedValue(done)) {
    await render(
      <ChangeDaySheet
        open
        onOpenChange={jest.fn()}
        weekday="MONDAY"
        exerciseCount={3}
        occupiedWeekdays={['WEDNESDAY']}
        onSubmit={onSubmit}
      />
    );
    return { onSubmit };
  }

  it('muestra el día y la cantidad, deshabilita los ocupados y Cambiar arranca deshabilitado', async () => {
    jest.mocked(actionSheet).mockResolvedValue(null);
    await renderChange();
    expect(screen.getByText('Cambiar de día · Lunes (3 ejercicios)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cambiar de día' }).props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: /^Pasar el lunes a/ }));

    const { options } = jest.mocked(actionSheet).mock.calls[0]![0];
    expect(options.find(option => option.value === 'WEDNESDAY')).toMatchObject({
      label: 'Miércoles · ya tiene ejercicios',
      disabled: true,
    });
  });

  it('manda el día elegido', async () => {
    jest.mocked(actionSheet).mockResolvedValue('THURSDAY');
    const { onSubmit } = await renderChange();
    await fireEvent.press(screen.getByRole('button', { name: /^Pasar el lunes a/ }));

    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar de día' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('THURSDAY'));
  });

  it('un 409 queda como aviso en la hoja con la ayuda del cliente', async () => {
    jest.mocked(actionSheet).mockResolvedValue('THURSDAY');
    await renderChange(jest.fn().mockResolvedValue(conflict('El plan ya tiene ese día')));
    await fireEvent.press(screen.getByRole('button', { name: /^Pasar el lunes a/ }));

    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar de día' }));

    expect(await screen.findByText(/El plan ya tiene ese día/)).toBeTruthy();
    expect(screen.getByText(/Elegí un día libre: los días no se juntan\./)).toBeTruthy();
  });
});

describe('PlanNameSheet', () => {
  async function renderName(initialName?: string, onSubmit = jest.fn().mockResolvedValue(done)) {
    await render(<PlanNameSheet open onOpenChange={jest.fn()} initialName={initialName} onSubmit={onSubmit} />);
    return { onSubmit };
  }

  it('el alta arranca con "Crear plan" deshabilitado, cuenta N/120 y manda el nombre sin espacios', async () => {
    const { onSubmit } = await renderName();
    const create = () => screen.getByRole('button', { name: 'Crear plan' });
    expect(create().props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText('0/120')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Nombre, obligatorio'), '  Fuerza ');
    expect(screen.getByText('9/120')).toBeTruthy();
    await fireEvent.press(create());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Fuerza'));
  });

  it('un nombre de solo espacios muestra "Ponele un nombre al plan" sin llamar a la API', async () => {
    const { onSubmit } = await renderName();

    await fireEvent.changeText(screen.getByLabelText('Nombre, obligatorio'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear plan' }));

    expect(screen.getByText('Ponele un nombre al plan')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renombrar precarga el nombre y "Guardar nombre" espera un cambio', async () => {
    const { onSubmit } = await renderName('Hipertrofia');
    const save = () => screen.getByRole('button', { name: 'Guardar nombre' });
    expect(screen.getByLabelText('Nombre, obligatorio').props.value).toBe('Hipertrofia');
    expect(save().props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByLabelText('Nombre, obligatorio'), 'Hipertrofia 4 días');
    await fireEvent.press(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Hipertrofia 4 días'));
  });

  it('un error queda como aviso en la hoja', async () => {
    await renderName(
      undefined,
      jest.fn().mockResolvedValue({ status: 'error', message: 'No se pudo crear el plan', conflict: false })
    );
    await fireEvent.changeText(screen.getByLabelText('Nombre, obligatorio'), 'Fuerza');

    await fireEvent.press(screen.getByRole('button', { name: 'Crear plan' }));

    expect(await screen.findByText('No se pudo crear el plan')).toBeTruthy();
  });
});
