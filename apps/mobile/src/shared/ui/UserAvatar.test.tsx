import { fireEvent, render, screen } from '@testing-library/react-native';

import { UserAvatar } from './UserAvatar';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('UserAvatar', () => {
  it('sin uri muestra las iniciales', () => {
    render(<UserAvatar name="Admin Omni" />);

    expect(screen.getByText('AO')).toBeTruthy();
  });

  it('con uri muestra la foto en lugar de las iniciales', () => {
    render(<UserAvatar name="Admin Omni" uri="https://cdn.test/a.webp" />);

    expect(screen.getByLabelText('Foto de Admin Omni')).toBeTruthy();
    expect(screen.queryByText('AO')).toBeNull();
  });

  it('si la foto no carga vuelve a las iniciales, y reintenta con otra uri', () => {
    const { rerender } = render(<UserAvatar name="Admin Omni" uri="https://cdn.test/a.webp" />);
    fireEvent(screen.getByLabelText('Foto de Admin Omni'), 'error', { nativeEvent: { error: 'x' } });

    expect(screen.getByText('AO')).toBeTruthy();

    rerender(<UserAvatar name="Admin Omni" uri="https://cdn.test/b.webp" />);
    expect(screen.getByLabelText('Foto de Admin Omni')).toBeTruthy();
  });
});
