import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { DayCard } from '../components/DayCard/DayCard';
import { day, exercise } from './fixtures';

import type { SaveOrderResult } from '../components/DayCard/DayReorderList';
import type { GymPlanDay } from '@omni/shared/gym';

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const twoExercises = day({
  exercises: [
    exercise(),
    exercise({ id: 'e2', catalogId: 'c2', name: 'Remo con barra', sets: 3, reps: '10', currentWeightKg: null }),
  ],
});

interface RenderOptions {
  day?: GymPlanDay;
  readOnly?: boolean;
  ordering?: boolean;
  locked?: boolean;
  onSaveOrder?: (day: GymPlanDay, ids: string[]) => Promise<SaveOrderResult>;
}

function renderDay(options: RenderOptions = {}) {
  const props = {
    onOpenWeight: vi.fn(),
    onEdit: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    onAddToDay: vi.fn(),
    onStartOrdering: vi.fn(),
    onChangeDay: vi.fn(),
    onDeleteDay: vi.fn(),
    onSaveOrder: options.onSaveOrder ?? vi.fn().mockResolvedValue('saved'),
    onCancelOrdering: vi.fn(),
    onReloadDay: vi.fn().mockResolvedValue(undefined),
  };
  renderWithProviders(
    <DayCard
      day={options.day ?? twoExercises}
      readOnly={options.readOnly ?? false}
      ordering={options.ordering ?? false}
      locked={options.locked ?? false}
      reorderKey={0}
      {...props}
    />
  );
  return props;
}

/** El dropdown de Mantine queda con `display: none` en happy-dom (sin layout): la consulta incluye lo oculto. */
async function menuItem(trigger: string, name: string) {
  await userEvent.click(screen.getByRole('button', { name: trigger }));
  return screen.findByRole('menuitem', { name, hidden: true });
}

describe('DayCard', () => {
  it('muestra el día, la cantidad y cada ejercicio con su peso o "Cargar peso"', () => {
    renderDay();

    const section = screen.getByRole('region', { name: 'Lunes' });
    expect(section).toHaveTextContent('2 ejercicios');
    expect(within(section).getByText('4 series · 12 repeticiones')).toBeInTheDocument();
    expect(within(section).getByText('3 series · 10 repeticiones')).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Peso de Sentadilla: 60 kg' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Cargar peso de Remo con barra' })).toBeInTheDocument();
  });

  it('no tiene la papelera ni el ícono de ordenar suelto: cada acción tiene un solo camino, el menú "⋯"', () => {
    renderDay();

    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reordenar/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opciones del lunes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opciones de Sentadilla' })).toBeInTheDocument();
  });

  it('el menú de la fila ofrece Editar, Mover de día y Quitar del día', async () => {
    const props = renderDay();

    await userEvent.click(await menuItem('Opciones de Remo con barra', 'Editar'));
    await userEvent.click(await menuItem('Opciones de Remo con barra', 'Mover de día'));
    await userEvent.click(await menuItem('Opciones de Remo con barra', 'Quitar del día'));

    expect(props.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'e2' }), 'Lunes');
    expect(props.onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 'e2' }), 'Lunes');
    expect(props.onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'e2' }), 'Lunes');
  });

  it('el menú del día ofrece agregar, ordenar, cambiar de día y borrar', async () => {
    const props = renderDay();

    await userEvent.click(await menuItem('Opciones del lunes', 'Agregar ejercicio a este día'));
    await userEvent.click(await menuItem('Opciones del lunes', 'Ordenar ejercicios'));
    await userEvent.click(await menuItem('Opciones del lunes', 'Cambiar de día'));
    await userEvent.click(await menuItem('Opciones del lunes', 'Borrar día'));

    expect(props.onAddToDay).toHaveBeenCalledWith(twoExercises);
    expect(props.onStartOrdering).toHaveBeenCalledWith(twoExercises);
    expect(props.onChangeDay).toHaveBeenCalledWith(twoExercises);
    expect(props.onDeleteDay).toHaveBeenCalledWith(twoExercises);
  });

  it('con un solo ejercicio no ofrece "Ordenar ejercicios"', async () => {
    renderDay({ day: day() });

    await userEvent.click(screen.getByRole('button', { name: 'Opciones del lunes' }));

    expect(await screen.findByRole('menuitem', { name: 'Borrar día', hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Ordenar ejercicios', hidden: true })).not.toBeInTheDocument();
  });

  it('en un plan archivado no hay menús y el peso abre el historial', async () => {
    const props = renderDay({ readOnly: true });

    expect(screen.queryByRole('button', { name: /Opciones/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sin peso, ver historial de Remo con barra' })).toHaveTextContent(
      'Sin peso'
    );
    await userEvent.click(screen.getByRole('button', { name: '60 kg, ver historial de Sentadilla' }));
    expect(props.onOpenWeight).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }), 'Lunes');
  });

  it('mientras otro día se ordena sus controles quedan deshabilitados', () => {
    renderDay({ locked: true });

    expect(screen.getByRole('button', { name: 'Opciones del lunes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Opciones de Sentadilla' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Peso de Sentadilla: 60 kg' })).toBeDisabled();
  });

  describe('modo orden', () => {
    it('muestra flechas y no arrastre, con subir y bajar deshabilitados en los extremos', () => {
      renderDay({ ordering: true });

      expect(screen.getByText('Ordená con las flechas')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Arrastrar/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Subir Sentadilla' })).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('button', { name: 'Bajar Sentadilla' })).toHaveAttribute('aria-disabled', 'false');
      expect(screen.getByRole('button', { name: 'Bajar Remo con barra' })).toHaveAttribute('aria-disabled', 'true');
      expect(screen.queryByRole('button', { name: 'Opciones del lunes' })).not.toBeInTheDocument();
    });

    it('Guardar orden arranca deshabilitado; al mover manda la lista completa, anuncia la posición y deja el foco', async () => {
      const onSaveOrder = vi.fn().mockResolvedValue('saved');
      renderDay({ ordering: true, onSaveOrder });
      expect(screen.getByRole('button', { name: 'Guardar orden' })).toBeDisabled();

      await userEvent.click(screen.getByRole('button', { name: 'Bajar Sentadilla' }));

      expect(screen.getByRole('status')).toHaveTextContent('Sentadilla, posición 2 de 2');
      expect(screen.getByRole('button', { name: 'Bajar Sentadilla' })).toHaveFocus();
      const names = screen.getAllByRole('listitem').map(item => item.textContent);
      expect(names[0]).toContain('Remo con barra');

      await userEvent.click(screen.getByRole('button', { name: 'Guardar orden' }));
      await waitFor(() => expect(onSaveOrder).toHaveBeenCalledWith(twoExercises, ['e2', 'e1']));
    });

    it('Cancelar descarta sin preguntar', async () => {
      const props = renderDay({ ordering: true });

      await userEvent.click(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(props.onCancelOrdering).toHaveBeenCalled();
      expect(props.onSaveOrder).not.toHaveBeenCalled();
    });

    it('un 409 muestra el aviso, bloquea Guardar y las flechas hasta recargar el día', async () => {
      const props = renderDay({ ordering: true, onSaveOrder: vi.fn().mockResolvedValue('conflict') });

      await userEvent.click(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
      await userEvent.click(screen.getByRole('button', { name: 'Guardar orden' }));

      const banner = (await screen.findByText('La lista no coincide con los ejercicios del día')).closest(
        '[role="alert"]'
      )!;
      expect(banner).toHaveTextContent('Recargá el día para ver la lista actual y volvé a ordenar.');
      expect(screen.getByRole('button', { name: 'Guardar orden' })).toBeDisabled();

      await userEvent.click(screen.getByRole('button', { name: 'Recargar el día' }));
      expect(props.onReloadDay).toHaveBeenCalled();
    });
  });
});
