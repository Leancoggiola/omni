import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { ChangeDayModal } from '../components/ChangeDayModal';
import { EditExerciseModal } from '../components/EditExerciseModal';
import { MoveExerciseModal } from '../components/MoveExerciseModal';
import { day, exercise } from './fixtures';

import type { GymSubmitResult } from '../utils/gymSubmit';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const done: GymSubmitResult = { status: 'done' };

const findBanner = async (message: string) => (await screen.findByText(message)).closest('[role="alert"]')!;

describe('EditExerciseModal', () => {
  const renderEdit = (onSubmit = vi.fn().mockResolvedValue(done), weight: number | null = 60) => {
    const onClose = vi.fn();
    renderWithProviders(
      <EditExerciseModal
        opened
        exercise={exercise({ currentWeightKg: weight })}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    return { onSubmit, onClose };
  };

  it('avisa que cambia en todos los planes y, con peso, que las series o repeticiones suman un registro', () => {
    renderEdit();

    expect(
      screen.getByText('Se cambia en todos tus planes que usan este ejercicio, también en los archivados.')
    ).toBeInTheDocument();
    expect(screen.getByText(/Como tiene 60 kg cargados/)).toBeInTheDocument();
  });

  it('sin peso no habla del historial', () => {
    renderEdit(undefined, null);

    expect(screen.queryByText(/Como tiene/)).not.toBeInTheDocument();
  });

  it('Guardar arranca deshabilitado y manda solo nombre, series y repeticiones', async () => {
    const { onSubmit } = renderEdit();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();

    const reps = screen.getByRole('textbox', { name: /Repeticiones/ });
    await userEvent.clear(reps);
    await userEvent.type(reps, '10');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('e1', { name: 'Sentadilla', sets: 4, reps: '10' }));
  });

  it('series vacías se mandan como null', async () => {
    const { onSubmit } = renderEdit();

    await userEvent.clear(screen.getByRole('textbox', { name: /Series/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('e1', expect.objectContaining({ sets: null })));
  });

  it('un 409 muestra el mensaje de la API con la ayuda del cliente y el formulario no se cierra', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      status: 'conflict',
      message: 'Ya existe un ejercicio con ese nombre, series y repeticiones',
    } satisfies GymSubmitResult);
    const { onClose } = renderEdit(onSubmit);

    await userEvent.type(screen.getByRole('textbox', { name: /Nombre/ }), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    const banner = await findBanner('Ya existe un ejercicio con ese nombre, series y repeticiones');
    expect(banner).toHaveTextContent('Ya existe un ejercicio con ese nombre, series y repeticiones');
    expect(banner).toHaveTextContent('Cambiá algún dato: los ejercicios no se fusionan.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('el nombre vacío se valida con el texto del canvas', async () => {
    const { onSubmit } = renderEdit();

    await userEvent.clear(screen.getByRole('textbox', { name: /Nombre/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Ponele un nombre al ejercicio')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('MoveExerciseModal', () => {
  const renderMove = (onSubmit = vi.fn().mockResolvedValue(done)) => {
    renderWithProviders(
      <MoveExerciseModal
        opened
        target={{ exercise: exercise(), weekday: 'MONDAY', occupiedWeekdays: ['MONDAY', 'FRIDAY'] }}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );
    return { onSubmit };
  };

  it('no ofrece el día de origen y deshabilita los días donde la variante ya está', async () => {
    renderMove();

    await userEvent.click(screen.getByRole('combobox', { name: /Mover a/ }));

    expect(screen.queryByRole('option', { name: 'Lunes', hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Viernes · ya lo tiene', hidden: true })).toHaveAttribute(
      'data-combobox-disabled'
    );
    expect(screen.getByRole('option', { name: 'Martes', hidden: true })).not.toHaveAttribute('data-combobox-disabled');
  });

  it('Mover arranca deshabilitado y manda solo el día elegido', async () => {
    const { onSubmit } = renderMove();
    expect(screen.getByRole('button', { name: 'Mover ejercicio' })).toBeDisabled();

    await userEvent.click(screen.getByRole('combobox', { name: /Mover a/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Martes', hidden: true }));
    await userEvent.click(screen.getByRole('button', { name: 'Mover ejercicio' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('e1', 'TUESDAY'));
  });

  it('un 409 queda dentro del formulario con la ayuda "Elegí otro día."', async () => {
    renderMove(
      vi
        .fn()
        .mockResolvedValue({ status: 'conflict', message: 'El ejercicio ya está en ese día' } satisfies GymSubmitResult)
    );

    await userEvent.click(screen.getByRole('combobox', { name: /Mover a/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Martes', hidden: true }));
    await userEvent.click(screen.getByRole('button', { name: 'Mover ejercicio' }));

    const banner = await findBanner('El ejercicio ya está en ese día');
    expect(banner).toHaveTextContent('El ejercicio ya está en ese día');
    expect(banner).toHaveTextContent('Elegí otro día.');
  });
});

describe('ChangeDayModal', () => {
  const renderChange = (onSubmit = vi.fn().mockResolvedValue(done)) => {
    renderWithProviders(
      <ChangeDayModal
        opened
        target={{ day: day({ exercises: [exercise(), exercise({ id: 'e2' })] }), occupiedWeekdays: ['WEDNESDAY'] }}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );
    return { onSubmit };
  };

  it('muestra el día actual, deshabilita los ocupados y Cambiar arranca deshabilitado', async () => {
    renderChange();
    expect(screen.getByRole('dialog', { name: /Cambiar de día/ })).toHaveTextContent('Lunes · 2 ejercicios');
    expect(screen.getByRole('button', { name: 'Cambiar de día' })).toBeDisabled();

    await userEvent.click(screen.getByRole('combobox', { name: /Pasar el lunes a/ }));

    expect(screen.getByRole('option', { name: 'Miércoles · ya tiene ejercicios', hidden: true })).toHaveAttribute(
      'data-combobox-disabled'
    );
  });

  it('manda el día de la semana elegido para el día', async () => {
    const { onSubmit } = renderChange();

    await userEvent.click(screen.getByRole('combobox', { name: /Pasar el lunes a/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Jueves', hidden: true }));
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar de día' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('d1', 'THURSDAY'));
  });

  it('un 409 queda dentro del formulario con la ayuda del cliente', async () => {
    renderChange(
      vi.fn().mockResolvedValue({ status: 'conflict', message: 'El plan ya tiene ese día' } satisfies GymSubmitResult)
    );

    await userEvent.click(screen.getByRole('combobox', { name: /Pasar el lunes a/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Jueves', hidden: true }));
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar de día' }));

    const banner = await findBanner('El plan ya tiene ese día');
    expect(banner).toHaveTextContent('El plan ya tiene ese día');
    expect(banner).toHaveTextContent('Elegí un día libre: los días no se juntan.');
  });
});
