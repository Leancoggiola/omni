import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SHEET_EXIT_MS } from '@/shared/ui';

import { exercise, weightEntry } from '../fixtures';
import { WeightSheet } from './WeightSheet';

const mockHistory = jest.fn();
const mockLoadMore = jest.fn();
const mockRevalidateHistory = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('../hooks/useGymWeightHistory', () => ({
  useGymWeightHistory: (id: string) => mockHistory(id),
}));

const history = (overrides = {}) => ({
  entries: [
    weightEntry({ id: 'w1', weightKg: 60, recordedAt: '2026-11-12T15:00:00.000Z' }),
    weightEntry({ id: 'w2', weightKg: 57.5, recordedAt: '2026-10-28T15:00:00.000Z' }),
  ],
  total: 2,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  error: undefined,
  loadMore: mockLoadMore,
  mutate: mockRevalidateHistory,
  ...overrides,
});

async function renderSheet(props: Partial<React.ComponentProps<typeof WeightSheet>> = {}) {
  const onSave = jest.fn().mockResolvedValue({ status: 'done' });
  const onClear = jest.fn().mockResolvedValue({ status: 'done' });
  const onOpenChange = jest.fn();
  await render(
    <WeightSheet
      open
      onOpenChange={onOpenChange}
      exercise={exercise()}
      weekday="MONDAY"
      readOnly={false}
      onSave={onSave}
      onClear={onClear}
      {...props}
    />
  );
  return { onSave, onClear, onOpenChange };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHistory.mockReturnValue(history());
  mockRevalidateHistory.mockResolvedValue(undefined);
});

describe('WeightSheet', () => {
  it('muestra el ejercicio, el día, el peso actual, el historial con el total y la nota de quitar', async () => {
    await renderSheet();

    expect(mockHistory).toHaveBeenCalledWith('e1');
    expect(screen.getByText('Sentadilla')).toBeTruthy();
    expect(screen.getByText('4 series · 12 repeticiones · Lunes · 60 kg')).toBeTruthy();
    expect(screen.getByLabelText('60 kg, 4 × 12, 12/11')).toBeTruthy();
    expect(screen.getByLabelText('57,5 kg, 4 × 12, 28/10')).toBeTruthy();
    expect(screen.getByText('2 registros')).toBeTruthy();
    expect(
      screen.getByText(
        'Quitar el peso lo borra en todos tus planes que usan Sentadilla 4 × 12. El historial se conserva.'
      )
    ).toBeTruthy();
  });

  it('+/- de 2,5 kg, "peso actual" y "antes", y Guardar deshabilitado sin cambios', async () => {
    await renderSheet();
    const save = () => screen.getByRole('button', { name: 'Guardar peso' });

    expect(save().props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText('kg · peso actual')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));
    expect(screen.getByLabelText('Peso en kg').props.value).toBe('62,5');
    expect(screen.getByText('kg · antes 60 kg')).toBeTruthy();
    expect(save().props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Restar 2,5 kg' }));
    expect(save().props.accessibilityState.disabled).toBe(true);
  });

  it('el primer peso arranca en "—", "+" arranca en 2,5 y Quitar peso no aparece', async () => {
    await renderSheet({ exercise: exercise({ currentWeightKg: null }) });

    expect(screen.getByLabelText('Peso en kg').props.value).toBe('');
    expect(screen.getByLabelText('Peso en kg').props.placeholder).toBe('—');
    expect(screen.getByText('kg · todavía sin peso')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Restar 2,5 kg' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Guardar peso' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Quitar peso' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));
    expect(screen.getByLabelText('Peso en kg').props.value).toBe('2,5');
    expect(screen.getByRole('button', { name: 'Guardar peso' }).props.accessibilityState.disabled).toBe(false);
  });

  it('se puede escribir el peso exacto con coma y 0 es válido', async () => {
    const { onSave } = await renderSheet({ exercise: exercise({ currentWeightKg: null }) });

    await fireEvent.changeText(screen.getByLabelText('Peso en kg'), '0');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar peso' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(0));
  });

  it('con un texto que no es un peso, + y - quedan deshabilitados y no lo pisan', async () => {
    await renderSheet();

    await fireEvent.changeText(screen.getByLabelText('Peso en kg'), '1,234');

    expect(screen.getByRole('button', { name: 'Sumar 2,5 kg' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Restar 2,5 kg' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText('Peso en kg').props.value).toBe('1,234');
  });

  it('un peso negativo o mayor al máximo muestra el error y bloquea Guardar', async () => {
    await renderSheet();
    const save = () => screen.getByRole('button', { name: 'Guardar peso' });

    await fireEvent.changeText(screen.getByLabelText('Peso en kg'), '-2,5');
    expect(screen.getByText('El peso no puede ser negativo')).toBeTruthy();
    expect(save().props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByLabelText('Peso en kg'), '1000000');
    expect(screen.getByText('El peso máximo es 999.999,99 kg')).toBeTruthy();
    expect(save().props.accessibilityState.disabled).toBe(true);
  });

  it('guardar manda el peso, revalida el historial y cierra', async () => {
    const { onSave, onOpenChange } = await renderSheet();
    await fireEvent.press(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar peso' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(62.5));
    expect(mockRevalidateHistory).toHaveBeenCalled();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('un error queda como aviso en la hoja, que sigue abierta con lo cargado', async () => {
    const onSave = jest
      .fn()
      .mockResolvedValue({ status: 'error', message: 'No se pudo guardar el peso', conflict: false });
    const { onOpenChange } = await renderSheet({ onSave });
    await fireEvent.press(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar peso' }));

    expect(await screen.findByText('No se pudo guardar el peso')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByLabelText('Peso en kg').props.value).toBe('62,5');
  });

  it('Quitar peso borra el peso sin confirmar, revalida el historial y cierra', async () => {
    const { onClear, onOpenChange } = await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Quitar peso' }));

    await waitFor(() => expect(onClear).toHaveBeenCalled());
    expect(mockRevalidateHistory).toHaveBeenCalled();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('si la hoja se cerró porque el plan ya no admite el cambio, cierra sin avisar acá', async () => {
    const onSave = jest.fn().mockResolvedValue({ status: 'closed' });
    const { onOpenChange } = await renderSheet({ onSave });
    await fireEvent.press(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar peso' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mockRevalidateHistory).not.toHaveBeenCalled();
  });

  it('"Ver más registros" pide la página siguiente', async () => {
    mockHistory.mockReturnValue(history({ hasMore: true, total: 7 }));
    await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver más registros' }));

    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('aclara el cambio de series o repeticiones comparando con la entrada más vieja cargada', async () => {
    mockHistory.mockReturnValue(
      history({
        entries: [
          weightEntry({ id: 'a', weightKg: 55, sets: 4 }),
          weightEntry({ id: 'b', weightKg: 55, sets: 3, recordedAt: '2026-10-14T15:00:00.000Z' }),
        ],
      })
    );
    await renderSheet();

    expect(screen.getByText('Cambiaron las series o repeticiones (antes 3 × 12)')).toBeTruthy();
  });

  it('si el historial falla lo dice con Reintentar y no bloquea guardar', async () => {
    mockHistory.mockReturnValue(history({ entries: [], total: 0, error: new Error('x') }));
    await renderSheet();

    expect(screen.getByText('No se pudo cargar el historial.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRevalidateHistory).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));
    expect(screen.getByRole('button', { name: 'Guardar peso' }).props.accessibilityState.disabled).toBe(false);
  });

  it('si falla una página siguiente deja los registros y avisa con Reintentar', async () => {
    mockHistory.mockReturnValue(history({ hasMore: true, total: 7, error: new Error('x') }));
    await renderSheet();

    expect(screen.getByText('No se pudieron cargar más registros.')).toBeTruthy();
    expect(screen.getByLabelText('60 kg, 4 × 12, 12/11')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRevalidateHistory).toHaveBeenCalled();
  });

  it('un peso de 1000 kg o más se edita sin separador de miles', async () => {
    await renderSheet({ exercise: exercise({ currentWeightKg: 1250 }) });

    expect(screen.getByLabelText('Peso en kg').props.value).toBe('1250');
    await fireEvent.press(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));
    expect(screen.getByLabelText('Peso en kg').props.value).toBe('1252,5');
  });

  it('sin historial lo dice', async () => {
    mockHistory.mockReturnValue(history({ entries: [], total: 0 }));
    await renderSheet();

    expect(screen.getByText('Todavía no hay registros. Cuando guardes el primer peso va a aparecer acá.')).toBeTruthy();
  });

  it('en un plan archivado es de solo lectura: aviso, peso actual e historial, sin editar', async () => {
    await renderSheet({ readOnly: true });

    expect(
      screen.getByText(
        'Plan archivado: solo podés ver el peso y su historial. Para cargar uno nuevo, desarchivá el plan.'
      )
    ).toBeTruthy();
    expect(screen.getByText('kg · peso actual')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sumar 2,5 kg' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Guardar peso' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Quitar peso' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Cerrar' })).toHaveLength(2);
  });

  it('avisa que terminó de cerrarse con onClosed, ya con el Modal oculto', async () => {
    jest.useFakeTimers();
    const onClosed = jest.fn();
    const { rerender } = await render(
      <WeightSheet
        open
        onOpenChange={jest.fn()}
        exercise={exercise()}
        weekday="MONDAY"
        readOnly={false}
        onSave={jest.fn()}
        onClear={jest.fn()}
        onClosed={onClosed}
      />
    );

    await rerender(
      <WeightSheet
        open={false}
        onOpenChange={jest.fn()}
        exercise={exercise()}
        weekday="MONDAY"
        readOnly={false}
        onSave={jest.fn()}
        onClear={jest.fn()}
        onClosed={onClosed}
      />
    );
    expect(onClosed).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(SHEET_EXIT_MS);
    });

    expect(onClosed).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
