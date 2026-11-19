import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { actionSheet } from '@/shared/ui/actionSheet/actionSheet';

import { catalogExercise } from '../fixtures';
import { AddExerciseSheet } from './AddExerciseSheet';

const mockCatalog = jest.fn();
const mockRetry = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/shared/ui/actionSheet/actionSheet', () => ({ actionSheet: jest.fn() }));
jest.mock('../hooks/useGymCatalogSuggestions', () => ({
  CATALOG_MIN_QUERY_LENGTH: 2,
  useGymCatalogSuggestions: (query: string) => mockCatalog(query),
}));

const SUGGESTIONS = [
  catalogExercise({ id: 'c1', name: 'Sentadilla', sets: 4, reps: '12', currentWeightKg: 60 }),
  catalogExercise({ id: 'c2', name: 'Sentadilla', sets: 3, reps: '8', currentWeightKg: 70 }),
  catalogExercise({ id: 'c3', name: 'Sentadilla búlgara', sets: 3, reps: '10', currentWeightKg: null }),
];

const catalogState = (overrides = {}) => ({
  suggestions: [],
  queried: false,
  searching: false,
  error: undefined,
  retry: mockRetry,
  ...overrides,
});

async function renderSheet(onAdd = jest.fn().mockResolvedValue({ status: 'done' })) {
  const onOpenChange = jest.fn();
  await render(<AddExerciseSheet open onOpenChange={onOpenChange} initialWeekday="WEDNESDAY" onAdd={onAdd} />);
  return { onAdd, onOpenChange };
}

const addButton = () => screen.getByRole('button', { name: 'Agregar ejercicio' });
const name = () => screen.getByLabelText('Nombre, obligatorio');

beforeEach(() => {
  jest.clearAllMocks();
  mockCatalog.mockImplementation((query: string) =>
    query.trim().length >= 2 ? catalogState({ suggestions: SUGGESTIONS, queried: true }) : catalogState()
  );
});

describe('AddExerciseSheet', () => {
  it('arranca en el día indicado, con la ayuda del catálogo y Agregar deshabilitado hasta escribir', async () => {
    await renderSheet();

    expect(screen.getByRole('button', { name: 'Día: Miércoles' })).toBeTruthy();
    expect(screen.getByText('Escribí al menos 2 letras para buscar en tu catálogo.')).toBeTruthy();
    expect(addButton().props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(name(), 'Remo');
    expect(addButton().props.accessibilityState.disabled).toBe(false);
  });

  it('valida con los textos del canvas antes de llamar a la API', async () => {
    const { onAdd } = await renderSheet();
    await fireEvent.changeText(name(), ' ');

    await fireEvent.press(addButton());

    expect(screen.getByText('Ponele un nombre al ejercicio')).toBeTruthy();
    expect(screen.getByText('Ingresá las repeticiones')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('series inválidas muestran el error y no envían', async () => {
    const { onAdd } = await renderSheet();
    await fireEvent.changeText(name(), 'Remo');
    await fireEvent.changeText(screen.getByLabelText('Repeticiones, obligatorio'), '10');
    await fireEvent.changeText(screen.getByLabelText('Series'), '1001');

    await fireEvent.press(addButton());

    expect(screen.getByText('Ingresá un número entero entre 1 y 1000')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('envía día, nombre, series (vacías como null) y repeticiones y cierra', async () => {
    const { onAdd, onOpenChange } = await renderSheet();
    await fireEvent.changeText(name(), '  Plancha ');
    await fireEvent.changeText(screen.getByLabelText('Repeticiones, obligatorio'), '60 s');

    await fireEvent.press(addButton());

    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith({ weekday: 'WEDNESDAY', name: 'Plancha', sets: null, reps: '60 s' })
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('mientras busca muestra la carga y no bloquea el formulario', async () => {
    mockCatalog.mockImplementation(() => catalogState({ queried: true, searching: true }));
    await renderSheet();

    await fireEvent.changeText(name(), 'Sen');

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
    expect(addButton().props.accessibilityState.disabled).toBe(false);
  });

  it('si la búsqueda falla lo dice con Reintentar', async () => {
    mockCatalog.mockImplementation(() => catalogState({ queried: true, error: new Error('x') }));
    await renderSheet();

    await fireEvent.changeText(name(), 'Sen');

    expect(screen.getByText('No pudimos buscar en tu catálogo. Podés cargarlo igual.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRetry).toHaveBeenCalled();
  });

  it('sin coincidencias dice qué se buscó y da el aviso suave', async () => {
    mockCatalog.mockImplementation(() => catalogState({ queried: true }));
    await renderSheet();

    await fireEvent.changeText(name(), 'Hip');

    expect(screen.getByText('Sin resultados para «Hip» en tu catálogo.')).toBeTruthy();
    expect(
      screen.getByText('Si ya lo tenés con las mismas series y repeticiones, se reutiliza su peso y su historial.')
    ).toBeTruthy();
  });

  it('lista las variantes con su peso o "Sin peso"', async () => {
    await renderSheet();

    await fireEvent.changeText(name(), 'Sen');

    expect(screen.getByRole('button', { name: 'Usar Sentadilla, 3 series · 8 repeticiones, 70 kg' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Usar Sentadilla búlgara, 3 series · 10 repeticiones, sin peso' })
    ).toBeTruthy();
    expect(screen.getByText('Sin peso')).toBeTruthy();
  });

  it('tocar una sugerencia completa el formulario y avisa que se reutiliza su peso e historial', async () => {
    const { onAdd } = await renderSheet();
    await fireEvent.changeText(name(), 'Sen');

    await fireEvent.press(screen.getByRole('button', { name: 'Usar Sentadilla, 3 series · 8 repeticiones, 70 kg' }));

    expect(name().props.value).toBe('Sentadilla');
    expect(screen.getByLabelText('Series').props.value).toBe('3');
    expect(screen.getByText('Ya la hiciste: se reutiliza su peso (70 kg) y su historial.')).toBeTruthy();
    await fireEvent.press(addButton());
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sentadilla', sets: 3, reps: '8' }))
    );
  });

  it('una variante sin peso dice que ya la tiene en el catálogo', async () => {
    await renderSheet();
    await fireEvent.changeText(name(), 'Sen');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Usar Sentadilla búlgara, 3 series · 10 repeticiones, sin peso' })
    );

    expect(screen.getByText('Ya la tenés en tu catálogo, sin peso cargado.')).toBeTruthy();
  });

  it('elegir otro día pasa por el selector', async () => {
    jest.mocked(actionSheet).mockResolvedValue('FRIDAY');
    const { onAdd } = await renderSheet();
    await fireEvent.press(screen.getByRole('button', { name: 'Día: Miércoles' }));
    await fireEvent.changeText(name(), 'Remo');
    await fireEvent.changeText(screen.getByLabelText('Repeticiones, obligatorio'), '10');

    await fireEvent.press(addButton());

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ weekday: 'FRIDAY' })));
  });

  it('un 409 queda como aviso dentro de la hoja con la ayuda del cliente, y la hoja sigue abierta', async () => {
    const onAdd = jest
      .fn()
      .mockResolvedValue({ status: 'error', message: 'El ejercicio ya está en ese día', conflict: true });
    const { onOpenChange } = await renderSheet(onAdd);
    await fireEvent.changeText(name(), 'Plancha');
    await fireEvent.changeText(screen.getByLabelText('Repeticiones, obligatorio'), '60 s');

    await fireEvent.press(addButton());

    expect(await screen.findByText(/El ejercicio ya está en ese día/)).toBeTruthy();
    expect(screen.getByText(/Elegí otro día o cambiá las series o las repeticiones\./)).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
