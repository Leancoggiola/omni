import { fireEvent, render, screen } from '@testing-library/react-native';

import { NotificationCard } from './NotificationCard';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('NotificationCard', () => {
  it('muestra título y mensaje, y "Cerrar notificación" la cierra', () => {
    const onClose = jest.fn();
    render(<NotificationCard variant="success" title="Listo" message="Agregado a tu lista" onClose={onClose} />);

    expect(screen.getByText('Listo')).toBeTruthy();
    expect(screen.getByText('Agregado a tu lista')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Cerrar notificación' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('es una superficie sólida de radio 16 con borde hairline y la sombra float', () => {
    render(<NotificationCard variant="error" title="Error" message="No se pudo" onClose={() => undefined} />);

    const card = screen.UNSAFE_getByProps({ accessibilityRole: 'alert' });
    expect(card.props).toMatchObject({
      backgroundColor: '$backgroundStrong',
      borderColor: '$hairline',
      borderRadius: 16,
      shadowRadius: 32,
      accessibilityLiveRegion: 'assertive',
    });
  });

  it('los éxitos se anuncian de forma cortés', () => {
    render(<NotificationCard variant="success" title="Listo" message="Hecho" onClose={() => undefined} />);

    expect(screen.UNSAFE_getByProps({ accessibilityRole: 'alert' }).props.accessibilityLiveRegion).toBe('polite');
  });
});
