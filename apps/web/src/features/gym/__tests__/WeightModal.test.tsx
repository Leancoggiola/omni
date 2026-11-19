import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { WeightModal } from '../components/WeightModal/WeightModal';
import { exercise, weightEntry } from './fixtures';

import type { GymSubmitResult } from '../utils/gymSubmit';
import type { GymExercise } from '@omni/shared/gym';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const history = vi.hoisted(() => ({
  pages: {} as Record<number, unknown>,
  calls: [] as number[],
}));

vi.mock('../hooks/useGymWeightHistory', () => ({
  WEIGHT_HISTORY_PAGE_SIZE: 2,
  useGymWeightHistory: (_exerciseId: string, page: number, enabled = true) => {
    if (enabled) history.calls.push(page);
    return (
      (enabled && history.pages[page]) || { entries: undefined, total: undefined, error: undefined, mutate: vi.fn() }
    );
  },
}));

const page = (entries: ReturnType<typeof weightEntry>[], total: number) => ({
  entries,
  total,
  error: undefined,
  mutate: vi.fn(),
});

type OnSave = Mock<(exercise: GymExercise, weightKg: number | null) => Promise<GymSubmitResult>>;

function renderModal(props: { exercise?: GymExercise; readOnly?: boolean; onSave?: OnSave } = {}) {
  const onSave: OnSave = props.onSave ?? vi.fn().mockResolvedValue({ status: 'done' });
  const onClose = vi.fn();
  renderWithProviders(
    <WeightModal
      opened
      onClose={onClose}
      exercise={props.exercise ?? exercise()}
      dayLabel="Lunes"
      readOnly={props.readOnly ?? false}
      onSave={onSave}
    />
  );
  return { onSave, onClose };
}

const input = () => screen.getByRole('textbox', { name: 'Peso en kg' });

describe('WeightModal', () => {
  beforeEach(() => {
    history.calls = [];
    history.pages = {
      1: page([weightEntry(), weightEntry({ id: 'w2', weightKg: 57.5, recordedAt: '2026-10-28T15:00:00.000Z' })], 3),
      2: page([weightEntry({ id: 'w3', weightKg: 50, sets: 3 })], 3),
    };
  });

  it('muestra el ejercicio, el día y el peso actual', () => {
    renderModal();

    expect(screen.getByRole('dialog', { name: /Sentadilla/ })).toHaveTextContent(
      '4 series · 12 repeticiones · Lunes · 60 kg'
    );
  });

  it('+ suma 2,5 kg, Guardar arranca deshabilitado y guarda el peso nuevo', async () => {
    const { onSave, onClose } = renderModal();
    const save = screen.getByRole('button', { name: 'Guardar peso' });
    expect(save).toBeDisabled();
    expect(screen.getByText('kg · peso actual')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));
    expect(input()).toHaveValue('62,5');
    expect(screen.getByText('kg · antes 60 kg')).toBeInTheDocument();

    await userEvent.click(save);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }), 62.5));
    expect(onClose).toHaveBeenCalled();
  });

  it('el primer peso arranca en "—", Guardar está deshabilitado y "+" arranca en 2,5', async () => {
    renderModal({ exercise: exercise({ currentWeightKg: null }) });

    expect(input()).toHaveValue('');
    expect(input()).toHaveAttribute('placeholder', '—');
    expect(screen.getByText('kg · todavía sin peso')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restar 2,5 kg' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar peso' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Quitar peso' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));
    expect(input()).toHaveValue('2,5');
    expect(screen.getByRole('button', { name: 'Guardar peso' })).toBeEnabled();
  });

  it('se puede escribir el peso exacto con coma y 0 es válido', async () => {
    const { onSave } = renderModal({ exercise: exercise({ currentWeightKg: null }) });

    await userEvent.type(input(), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar peso' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.anything(), 0));
  });

  it('un peso negativo o mayor al máximo muestra el error y bloquea Guardar', async () => {
    renderModal();

    await userEvent.clear(input());
    await userEvent.type(input(), '-2,5');
    expect(screen.getByRole('alert')).toHaveTextContent('El peso no puede ser negativo');
    expect(screen.getByRole('button', { name: 'Guardar peso' })).toBeDisabled();

    await userEvent.clear(input());
    await userEvent.type(input(), '1000000');
    expect(screen.getByRole('alert')).toHaveTextContent('El peso máximo es 999.999,99 kg');
    expect(screen.getByRole('button', { name: 'Guardar peso' })).toBeDisabled();
  });

  it('con el mismo peso Guardar sigue deshabilitado', async () => {
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));
    await userEvent.click(screen.getByRole('button', { name: 'Restar 2,5 kg' }));

    expect(screen.getByRole('button', { name: 'Guardar peso' })).toBeDisabled();
  });

  it('"Quitar peso" guarda null sin confirmar y aclara que el historial se conserva', async () => {
    const { onSave } = renderModal();
    expect(screen.getByText(/El historial se conserva/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Quitar peso' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }), null));
  });

  it('mientras guarda no se puede cerrar con Escape ni con la X', async () => {
    let finish: (result: GymSubmitResult) => void = () => undefined;
    const onSave: OnSave = vi.fn().mockReturnValue(new Promise<GymSubmitResult>(resolve => (finish = resolve)));
    const { onClose } = renderModal({ onSave });

    await userEvent.click(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar peso' }));
    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();

    finish({ status: 'done' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('si el guardado no sale el modal queda abierto con lo cargado', async () => {
    const { onClose } = renderModal({ onSave: vi.fn().mockResolvedValue({ status: 'failed' }) });

    await userEvent.click(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar peso' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar peso' })).toBeEnabled());
    expect(onClose).not.toHaveBeenCalled();
    expect(input()).toHaveValue('62,5');
  });

  it('lista el historial con el total y "Ver más registros" trae la página siguiente', async () => {
    renderModal();

    const table = screen.getByRole('table', { name: 'Historial de peso' });
    expect(screen.getByText('3 registros')).toBeInTheDocument();
    expect(table).toHaveTextContent('60 kg4 × 1212/11');
    expect(table).toHaveTextContent('57,5 kg');

    await userEvent.click(screen.getByRole('button', { name: 'Ver más registros' }));

    expect(table).toHaveTextContent('50 kg3 × 12');
    expect(history.calls).toContain(2);
    expect(screen.queryByRole('button', { name: 'Ver más registros' })).not.toBeInTheDocument();
  });

  it('aclara el cambio de series o repeticiones comparando con la entrada más vieja ya cargada', () => {
    history.pages = {
      1: page(
        [
          weightEntry({ id: 'a', weightKg: 55, sets: 4 }),
          weightEntry({ id: 'b', weightKg: 55, sets: 3, recordedAt: '2026-10-14T15:00:00.000Z' }),
        ],
        2
      ),
    };
    renderModal();

    expect(screen.getByText('Cambiaron las series o repeticiones (antes 3 × 12)')).toBeInTheDocument();
  });

  it('si el historial falla lo dice con "Reintentar" y no bloquea guardar', async () => {
    const mutate = vi.fn();
    history.pages = { 1: { entries: undefined, total: undefined, error: new Error('x'), mutate } };
    renderModal();

    expect(screen.getByText('No se pudo cargar el historial.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mutate).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));
    expect(screen.getByRole('button', { name: 'Guardar peso' })).toBeEnabled();
  });

  it('sin historial lo dice', () => {
    history.pages = { 1: page([], 0) };
    renderModal();

    expect(screen.getByText(/Todavía no hay registros/)).toBeInTheDocument();
  });

  it('en un plan archivado se ve el aviso, el peso y el historial, sin editar', () => {
    renderModal({ readOnly: true });

    expect(screen.getByText('Plan archivado')).toBeInTheDocument();
    expect(screen.getByText('kg · peso actual')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Historial de peso' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sumar 2,5 kg' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar peso' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar peso' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });
});
