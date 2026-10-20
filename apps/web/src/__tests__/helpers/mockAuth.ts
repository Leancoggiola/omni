import type { AuthContextValue } from '@/core/auth';
import type { SessionUser } from '@omni/shared/auth';

export function createMockSessionUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    name: 'Test User',
    username: 'testuser',
    email: null,
    role: 'USER',
    avatarUrl: null,
    theme: 'light',
    ...overrides,
  };
}

type MockAuthValue = AuthContextValue;

export function createMockAuthValue(overrides: Partial<MockAuthValue> = {}): MockAuthValue {
  return { ...defaultAuthValue(), ...overrides };
}

function defaultAuthValue(): MockAuthValue {
  return {
    user: createMockSessionUser(),
    isLoading: false,
    error: undefined,
    login: async () => {},
    logout: async () => {},
    clearSession: async () => {},
    retry: async () => {},
  };
}
