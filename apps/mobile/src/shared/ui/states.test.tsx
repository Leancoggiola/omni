import { fireEvent, render, screen } from '@testing-library/react-native';
import { TrayIcon } from 'phosphor-react-native';
import { Text } from 'react-native';

import { getByHostProps, queryAllByHostProps } from '@/test/hostQueries';

import { EmptyState, ErrorState, LoadingState } from './states';

let mockReduceMotion = false;

jest.mock('./useReduceMotion', () => ({ useReduceMotion: () => mockReduceMotion }));

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('ErrorState', () => {
  it('es una alerta con el mensaje en display y sin "Reintentar" si no hay acción', async () => {
    await render(<ErrorState message="No se pudieron cargar las efemérides de hoy" />);

    expect(getByHostProps({ accessibilityRole: 'alert' })).toBeTruthy();
    expect(screen.getByText('No se pudieron cargar las efemérides de hoy')).toHaveProp('fontFamily', 'display');
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('"Reintentar" llama a onRetry y queda ocupado mientras reintenta', async () => {
    const onRetry = jest.fn();
    const { rerender } = await render(<ErrorState onRetry={onRetry} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await rerender(<ErrorState onRetry={onRetry} retrying />);
    expect(screen.getByRole('button', { name: 'Reintentar', busy: true })).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('muestra la descripción opcional debajo del título', async () => {
    await render(<EmptyState icon={TrayIcon} title="Sin planes" description="Armá un plan." />);

    expect(screen.getByText('Sin planes')).toBeTruthy();
    expect(screen.getByText('Armá un plan.')).toBeTruthy();
  });

  it('muestra el título en display y la acción debajo', async () => {
    await render(<EmptyState icon={TrayIcon} title="Tu lista está vacía" action={<></>} />);

    expect(screen.getByText('Tu lista está vacía')).toHaveProp('fontFamily', 'display');
  });
});

describe('variantes compact', () => {
  it('el vacío no suma otra superficie y muestra título, descripción y acción', async () => {
    await render(
      <EmptyState
        compact
        icon={TrayIcon}
        title="Sin ubicación"
        description="Activala."
        action={<Text>Permitir</Text>}
      />
    );

    expect(screen.getByText('Sin ubicación')).not.toHaveProp('fontFamily', 'display');
    expect(screen.getByText('Activala.')).toBeTruthy();
    expect(screen.getByText('Permitir')).toBeTruthy();
    expect(queryAllByHostProps({ backgroundColor: 'backgroundStrong' })).toHaveLength(0);
  });

  it('el error sigue siendo una alerta con "Reintentar", sin otra superficie', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState compact message="No se pudo cargar el clima" onRetry={onRetry} />);

    expect(getByHostProps({ accessibilityRole: 'alert' })).toBeTruthy();
    expect(screen.getByText('No se pudo cargar el clima')).toBeTruthy();
    expect(queryAllByHostProps({ backgroundColor: 'backgroundStrong' })).toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('el skeleton se llama "Cargando" y sus filas no son cards', async () => {
    await render(<LoadingState compact variant="skeleton" rows={1} />);

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
    expect(queryAllByHostProps({ backgroundColor: 'surfaceGlass' })).toHaveLength(0);
    expect(queryAllByHostProps({ backgroundColor: 'track' }).length).toBeGreaterThan(0);
  });
});

describe('LoadingState', () => {
  beforeEach(() => {
    mockReduceMotion = false;
  });

  it('por defecto es el spinner de marca', async () => {
    await render(<LoadingState />);

    expect(screen.getByTestId('spinner')).toBeTruthy();
  });

  it('con variant="skeleton" se llama "Cargando" y dibuja 3 filas por defecto, o las que se pidan', async () => {
    const rowsDrawn = () => queryAllByHostProps({ backgroundColor: 'surfaceGlass' }).length;

    const { rerender } = await render(<LoadingState variant="skeleton" rows={1} />);
    const perRow = rowsDrawn();
    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
    expect(screen.queryByTestId('spinner')).toBeNull();

    await rerender(<LoadingState variant="skeleton" />);
    expect(rowsDrawn()).toBe(3 * perRow);

    await rerender(<LoadingState variant="skeleton" rows={5} />);
    expect(rowsDrawn()).toBe(5 * perRow);
  });

  it('las filas skeleton son bloques en track', async () => {
    await render(<LoadingState variant="skeleton" rows={1} />);

    expect(queryAllByHostProps({ backgroundColor: 'track' }).length).toBeGreaterThan(0);
  });

  it('con "reducir movimiento" quedan quietas, sin pulso', async () => {
    mockReduceMotion = true;
    await render(<LoadingState variant="skeleton" />);

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
  });
});
