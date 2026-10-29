import { fireEvent, render, screen } from '@testing-library/react-native';
import { TrayIcon } from 'phosphor-react-native';

import { EmptyState, ErrorState } from './states';

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
