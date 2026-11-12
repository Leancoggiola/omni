/**
 * Doble de `expo-local-authentication` para tests de biometría (sin hardware real). Se carga con
 * `jest.mock('expo-local-authentication', () => jest.requireActual('@/test/localAuthenticationMock'))`. Cada mock
 * arranca como un teléfono con huella enrolada que acepta la autenticación; `resetLocalAuthentication` lo restablece
 * y cada test pisa lo que necesita (`hasHardwareAsync`, `isEnrolledAsync`, `supportedAuthenticationTypesAsync`,
 * `authenticateAsync`).
 */
export enum AuthenticationType {
  FINGERPRINT = 1,
  FACIAL_RECOGNITION = 2,
  IRIS = 3,
}

export const hasHardwareAsync = jest.fn<Promise<boolean>, []>();
export const isEnrolledAsync = jest.fn<Promise<boolean>, []>();
export const supportedAuthenticationTypesAsync = jest.fn<Promise<AuthenticationType[]>, []>();
export const authenticateAsync = jest.fn<
  Promise<{ success: true } | { success: false; error: string }>,
  [Record<string, unknown>?]
>();

export function resetLocalAuthentication() {
  hasHardwareAsync.mockReset().mockResolvedValue(true);
  isEnrolledAsync.mockReset().mockResolvedValue(true);
  supportedAuthenticationTypesAsync.mockReset().mockResolvedValue([AuthenticationType.FINGERPRINT]);
  authenticateAsync.mockReset().mockResolvedValue({ success: true });
}

resetLocalAuthentication();
