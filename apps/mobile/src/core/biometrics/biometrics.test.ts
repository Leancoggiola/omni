import { AuthenticationType } from 'expo-local-authentication';

import {
  biometricNoun,
  detectBiometricKind,
  isSensitiveModule,
  isUnlockFresh,
  SENSITIVE_UNLOCK_TTL_MS,
  toBiometricResult,
} from './biometrics';

jest.mock('expo-local-authentication', () => jest.requireActual('@/test/localAuthenticationMock'));

describe('detectBiometricKind', () => {
  it.each([
    [[AuthenticationType.FINGERPRINT], 'fingerprint'],
    [[AuthenticationType.FACIAL_RECOGNITION], 'face'],
    [[AuthenticationType.FINGERPRINT, AuthenticationType.FACIAL_RECOGNITION], 'both'],
    [[AuthenticationType.IRIS], 'generic'],
    [[], 'generic'],
  ] as const)('%j → %s', (types, kind) => {
    expect(detectBiometricKind(types)).toBe(kind);
  });
});

describe('biometricNoun', () => {
  it('adapta el texto al tipo de biometría', () => {
    expect(biometricNoun('fingerprint')).toBe('huella');
    expect(biometricNoun('face')).toBe('rostro');
    expect(biometricNoun('both')).toBe('huella o rostro');
    expect(biometricNoun('generic')).toBe('biometría');
  });
});

describe('toBiometricResult', () => {
  it('éxito', () => {
    expect(toBiometricResult({ success: true })).toBe('success');
  });

  it.each(['user_cancel', 'system_cancel', 'app_cancel'])('%s es una cancelación', error => {
    expect(toBiometricResult({ success: false, error })).toBe('cancelled');
  });

  it.each(['authentication_failed', 'lockout', 'not_enrolled', 'timeout'])('%s es una falla', error => {
    expect(toBiometricResult({ success: false, error })).toBe('failed');
  });
});

describe('isSensitiveModule', () => {
  it('Gastos es sensible y el resto de los módulos no', () => {
    expect(isSensitiveModule('expenses')).toBe(true);
    expect(isSensitiveModule('pantry')).toBe(false);
  });
});

describe('isUnlockFresh', () => {
  it('sin desbloqueo no está vigente', () => {
    expect(isUnlockFresh(null, 1_000)).toBe(false);
  });

  it('vale hasta el tope y deja de valer después', () => {
    expect(isUnlockFresh(0, SENSITIVE_UNLOCK_TTL_MS)).toBe(true);
    expect(isUnlockFresh(0, SENSITIVE_UNLOCK_TTL_MS + 1)).toBe(false);
  });
});
