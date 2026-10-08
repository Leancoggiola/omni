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

export function createMockAuthValue(overrides: Partial<ReturnType<typeof defaultAuthValue>> = {}) {
  return { ...defaultAuthValue(), ...overrides };
}

function defaultAuthValue() {
  return {
    user: createMockSessionUser(),
    isAuthenticated: true,
    isLoading: false,
    error: undefined,
    login: async () => {},
    logout: async () => {},
  };
}
