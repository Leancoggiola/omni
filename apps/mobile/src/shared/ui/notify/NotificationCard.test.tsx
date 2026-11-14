import { fireEvent, render, screen } from '@testing-library/react-native';

import { NotificationCard } from './NotificationCard';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('NotificationCard', () => {
  it('muestra título y mensaje, y "Cerrar notificación" la cierra', async () => {
    const onClose = jest.fn();
    await render(<NotificationCard variant="success" title="Listo" message="Agregado a tu lista" onClose={onClose} />);

    expect(screen.getByText('Listo')).toBeTruthy();
    expect(screen.getByText('Agregado a tu lista')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar notificación' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('es una superficie sólida de radio 16 con borde hairline y la sombra float', async () => {
    await render(<NotificationCard variant="error" title="Error" message="No se pudo" onClose={() => undefined} />);

    const card = screen.root!;
    expect(card).toHaveProp('accessibilityRole', 'alert');
    expect(card.props).toMatchObject({
      backgroundColor: 'backgroundStrong',
      borderColor: 'hairline',
      borderRadius: 16,
      shadowRadius: 32,
      accessibilityLiveRegion: 'assertive',
    });
  });

  it('los éxitos se anuncian de forma cortés', async () => {
    await render(<NotificationCard variant="success" title="Listo" message="Hecho" onClose={() => undefined} />);

    expect(screen.root).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(screen.root).toHaveProp('accessibilityRole', 'alert');
  });
});
