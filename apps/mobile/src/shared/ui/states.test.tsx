import { fireEvent, render, screen } from '@testing-library/react-native';
import { TrayIcon } from 'phosphor-react-native';

import { EmptyState, ErrorState, LoadingState } from './states';

let mockReduceMotion = false;

jest.mock('./useReduceMotion', () => ({ useReduceMotion: () => mockReduceMotion }));

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('ErrorState', () => {
  it('es una alerta con el mensaje en display y sin "Reintentar" si no hay acción', () => {
    render(<ErrorState message="No se pudieron cargar las efemérides de hoy" />);

    expect(screen.UNSAFE_getByProps({ accessibilityRole: 'alert' })).toBeTruthy();
    expect(screen.getByText('No se pudieron cargar las efemérides de hoy')).toHaveProp('fontFamily', '$display');
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('"Reintentar" llama a onRetry y queda ocupado mientras reintenta', () => {
    const onRetry = jest.fn();
    const { rerender } = render(<ErrorState onRetry={onRetry} />);

    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<ErrorState onRetry={onRetry} retrying />);
    expect(screen.getByRole('button', { name: 'Reintentar', busy: true })).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('muestra el título en display y la acción debajo', () => {
    render(<EmptyState icon={TrayIcon} title="Tu lista está vacía" action={<></>} />);

    expect(screen.getByText('Tu lista está vacía')).toHaveProp('fontFamily', '$display');
  });
});

describe('LoadingState', () => {
  beforeEach(() => {
    mockReduceMotion = false;
  });

  it('por defecto es el spinner de marca', () => {
    render(<LoadingState />);

    expect(screen.getByTestId('spinner')).toBeTruthy();
  });

  it('con variant="skeleton" se llama "Cargando" y dibuja 3 filas por defecto, o las que se pidan', () => {
    const rowsDrawn = () => screen.UNSAFE_getAllByProps({ backgroundColor: '$surfaceGlass' }).length;

    const { rerender } = render(<LoadingState variant="skeleton" rows={1} />);
    const perRow = rowsDrawn();
    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
    expect(screen.queryByTestId('spinner')).toBeNull();

    rerender(<LoadingState variant="skeleton" />);
    expect(rowsDrawn()).toBe(3 * perRow);

    rerender(<LoadingState variant="skeleton" rows={5} />);
    expect(rowsDrawn()).toBe(5 * perRow);
  });

  it('las filas skeleton son bloques en track', () => {
    render(<LoadingState variant="skeleton" rows={1} />);

    expect(screen.UNSAFE_getAllByProps({ backgroundColor: '$track' }).length).toBeGreaterThan(0);
  });

  it('con "reducir movimiento" quedan quietas, sin pulso', () => {
    mockReduceMotion = true;
    render(<LoadingState variant="skeleton" />);

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
  });
});
