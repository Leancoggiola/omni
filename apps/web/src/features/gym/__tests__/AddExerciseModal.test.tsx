import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { AddExerciseModal } from '../components/AddExerciseModal/AddExerciseModal';
import { catalogExercise } from './fixtures';

import type { GymSubmitResult } from '../utils/gymSubmit';
import type { GymCatalogExercise } from '@omni/shared/gym';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const catalog = vi.hoisted(() => ({
  suggestions: [] as GymCatalogExercise[],
  searching: false,
  error: undefined as unknown,
  retry: vi.fn(),
}));

vi.mock('../hooks/useGymCatalog', () => ({
  CATALOG_MIN_QUERY_LENGTH: 2,
  useGymCatalog: (query: string) => {
    const queried = query.trim().length >= 2;
    return {
      suggestions: queried && !catalog.error ? catalog.suggestions : [],
      queried,
      searching: queried && catalog.searching,
      error: queried ? catalog.error : undefined,
      retry: catalog.retry,
      capped: false,
    };
  },
}));

function renderModal(onSubmit = vi.fn().mockResolvedValue({ status: 'done' } satisfies GymSubmitResult)) {
  const onClose = vi.fn();
  renderWithProviders(
    <AddExerciseModal opened onClose={onClose} planId="plan1" weekday="WEDNESDAY" onSubmit={onSubmit} />
  );
  return { onSubmit, onClose };
}

const name = () => screen.getByRole('textbox', { name: /Nombre/ });

describe('AddExerciseModal', () => {
  beforeEach(() => {
    catalog.suggestions = [catalogExercise(), catalogExercise({ id: 'c2', sets: 3, reps: '8', currentWeightKg: 70 })];
    catalog.searching = false;
    catalog.error = undefined;
    catalog.retry = vi.fn();
  });

  it('arranca en el día indicado y manda el payload con las series vacías como null', async () => {
    catalog.suggestions = [];
    const { onSubmit } = renderModal();
    expect(screen.getByRole('combobox', { name: /Día/ })).toHaveValue('Miércoles');

    await userEvent.type(name(), 'Plancha');
    await userEvent.type(screen.getByRole('textbox', { name: /Repeticiones/ }), '60 s');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar ejercicio' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        planId: 'plan1',
        weekday: 'WEDNESDAY',
        name: 'Plancha',
        sets: null,
        reps: '60 s',
      })
    );
  });

  it('valida con los textos del canvas antes de llamar a la API', async () => {
    const { onSubmit } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Agregar ejercicio' }));

    expect(await screen.findByText('Ponele un nombre al ejercicio')).toBeInTheDocument();
    expect(screen.getByText('Ingresá las repeticiones')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('con menos de 2 letras solo da la ayuda y no lista nada', async () => {
    renderModal();
    expect(screen.getByText('Escribí al menos 2 letras para buscar en tu catálogo.')).toBeInTheDocument();

    await userEvent.type(name(), 'S');

    expect(screen.getByText('Escribí al menos 2 letras para buscar en tu catálogo.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Ejercicios de tu catálogo' })).not.toBeInTheDocument();
  });

  it('mientras busca muestra la carga y no bloquea el formulario', async () => {
    catalog.searching = true;
    renderModal();

    await userEvent.type(name(), 'Sen');

    expect(screen.getByRole('status', { name: 'Buscando en tu catálogo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar ejercicio' })).toBeEnabled();
  });

  it('si la búsqueda falla lo dice con "Reintentar" y se puede cargar igual', async () => {
    catalog.error = new Error('x');
    renderModal();

    await userEvent.type(name(), 'Sen');

    expect(screen.getByText('No pudimos buscar en tu catálogo. Podés cargarlo igual.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(catalog.retry).toHaveBeenCalled();
  });

  it('sin coincidencias dice qué se buscó', async () => {
    catalog.suggestions = [];
    renderModal();

    await userEvent.type(name(), 'Hip');

    expect(screen.getByText('Sin resultados para «Hip» en tu catálogo.')).toBeInTheDocument();
  });

  it('lista las variantes con su peso o "Sin peso" y avisa si vinieron 20', async () => {
    catalog.suggestions = Array.from({ length: 20 }, (_, index) =>
      catalogExercise({ id: `c${index}`, name: `Sentadilla ${index}`, currentWeightKg: index === 0 ? null : 60 })
    );
    renderModal();

    await userEvent.type(name(), 'Sen');

    const list = screen.getByRole('group', { name: 'Ejercicios de tu catálogo' });
    expect(list).toHaveTextContent('Sin peso');
    expect(list).toHaveTextContent('60 kg');
    expect(screen.getByText('Mostramos 20 coincidencias. Escribí más para afinar la búsqueda.')).toBeInTheDocument();
  });

  it('elegir una sugerencia completa el formulario y avisa que se reutiliza su peso e historial', async () => {
    const { onSubmit } = renderModal();
    await userEvent.type(name(), 'Sen');

    await userEvent.click(screen.getByRole('button', { name: 'Sentadilla, 3 series · 8 repeticiones, 70 kg' }));

    expect(name()).toHaveValue('Sentadilla');
    expect(screen.getByRole('textbox', { name: /Series/ })).toHaveValue('3');
    expect(screen.getByRole('textbox', { name: /Repeticiones/ })).toHaveValue('8');
    expect(screen.getByText('Ya la hiciste: se reutiliza su peso (70 kg) y su historial.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Agregar ejercicio' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sentadilla', sets: 3, reps: '8' }))
    );
  });

  it('una variante sin peso dice que ya la tiene en el catálogo', async () => {
    catalog.suggestions = [catalogExercise({ currentWeightKg: null })];
    renderModal();
    await userEvent.type(name(), 'Sen');

    await userEvent.click(screen.getByRole('button', { name: 'Sentadilla, 4 series · 12 repeticiones, sin peso' }));

    expect(screen.getByText('Ya la tenés en tu catálogo, sin peso cargado.')).toBeInTheDocument();
  });

  it('si la coincidencia no vino en los resultados da el aviso suave', async () => {
    catalog.suggestions = [];
    renderModal();

    await userEvent.type(name(), 'Hip');

    expect(
      screen.getByText('Si ya lo tenés con las mismas series y repeticiones, se reutiliza su peso y su historial.')
    ).toBeInTheDocument();
  });

  it('un 409 se muestra como aviso dentro del formulario, con el mensaje de la API en negrita, y no cierra', async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ status: 'conflict', message: 'El ejercicio ya está en ese día' } satisfies GymSubmitResult);
    const { onClose } = renderModal(onSubmit);
    await userEvent.type(name(), 'Plancha');
    await userEvent.type(screen.getByRole('textbox', { name: /Repeticiones/ }), '60 s');

    await userEvent.click(screen.getByRole('button', { name: 'Agregar ejercicio' }));

    const banner = (await screen.findByText('El ejercicio ya está en ese día')).closest('[role="alert"]')!;
    expect(banner).toHaveTextContent('El ejercicio ya está en ese día');
    expect(banner).toHaveTextContent('Elegí otro día o cambiá las series o las repeticiones.');
    expect(onClose).not.toHaveBeenCalled();
    expect(name()).toHaveValue('Plancha');
  });
});
