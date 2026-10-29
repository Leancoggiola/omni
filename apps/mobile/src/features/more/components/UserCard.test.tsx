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
  mockUser = { name: 'Leandro Coggiola', email: 'leandro@ejemplo.com', username: 'leandroc' };
});

describe('UserCard', () => {
  it('es una card glass con el nombre y el email, y lleva a Perfil', () => {
    render(<UserCard />);

    const card = screen.getByRole('button', { name: 'Leandro Coggiola. Ver perfil' });
    expect(card).toHaveProp('backgroundColor', '$surfaceGlass');
    expect(card).toHaveProp('borderRadius', 24);
    expect(screen.getByText('leandro@ejemplo.com')).toBeTruthy();

    fireEvent.press(card);
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('sin email muestra el usuario', () => {
    mockUser = { name: 'Leandro Coggiola', email: null, username: 'leandroc' };
    render(<UserCard />);

    expect(screen.getByText('@leandroc')).toBeTruthy();
  });
});
