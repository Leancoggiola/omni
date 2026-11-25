import { fireEvent, render, screen } from '@testing-library/react-native';

import { UserCard } from './UserCard';

const mockNavigate = jest.fn();
let mockUser: { name: string; email: string | null; username: string } | null = null;

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('@/core/auth', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }) }));

beforeEach(() => {
  mockNavigate.mockClear();
  mockUser = { name: 'Ana Gomez', email: 'ana@ejemplo.com', username: 'anag' };
});

describe('UserCard', () => {
  it('es una card glass con el nombre y el email, y lleva a Perfil', async () => {
    await render(<UserCard />);

    const card = screen.getByRole('button', { name: 'Ana Gomez. Ver perfil' });
    expect(card).toHaveProp('backgroundColor', 'surfaceGlass');
    expect(card).toHaveProp('borderRadius', 24);
    expect(screen.getByText('ana@ejemplo.com')).toBeTruthy();

    await fireEvent.press(card);
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('sin email muestra el usuario', async () => {
    mockUser = { name: 'Ana Gomez', email: null, username: 'anag' };
    await render(<UserCard />);

    expect(screen.getByText('@anag')).toBeTruthy();
  });
});
