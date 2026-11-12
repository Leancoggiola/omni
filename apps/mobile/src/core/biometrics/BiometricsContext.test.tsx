import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { store } from '@/test/secureStoreMock';
import {
  authenticateAsync,
  AuthenticationType,
  hasHardwareAsync,
  isEnrolledAsync,
  resetLocalAuthentication,
  supportedAuthenticationTypesAsync,
} from '@/test/localAuthenticationMock';

import { SENSITIVE_UNLOCK_TTL_MS } from './biometrics';
import { BiometricsProvider, useBiometrics } from './BiometricsContext';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/secureStoreMock'));
jest.mock('expo-local-authentication', () => jest.requireActual('@/test/localAuthenticationMock'));

const secure = jest.requireMock<typeof import('@/test/secureStoreMock')>('expo-secure-store');

const PREFERENCE_KEY = 'omni.biometricEnabled';

let appStateListener: ((state: AppStateStatus) => void) | undefined;
const removeListener = jest.fn();

const renderBiometrics = async () => {
  const hook = renderHook(() => useBiometrics(), { wrapper: BiometricsProvider });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
};

const goTo = (state: AppStateStatus) => act(() => appStateListener?.(state));

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
  resetLocalAuthentication();
  appStateListener = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateListener = handler as (state: AppStateStatus) => void;
    return { remove: removeListener } as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('BiometricsProvider · disponibilidad', () => {
  it('con huella enrolada está disponible, con el texto de huella, pero no activada ni bloqueada', async () => {
    const { result } = await renderBiometrics();

    expect(result.current).toMatchObject({ available: true, kind: 'fingerprint', noun: 'huella' });
    expect(result.current).toMatchObject({ enabled: false, locked: false });
  });

  it('sin hardware no está disponible', async () => {
    hasHardwareAsync.mockResolvedValue(false);
    const { result } = await renderBiometrics();

    expect(result.current).toMatchObject({ available: false, enabled: false, locked: false });
    expect(supportedAuthenticationTypesAsync).not.toHaveBeenCalled();
  });

  it('con hardware pero sin nada enrolado no está disponible', async () => {
    isEnrolledAsync.mockResolvedValue(false);
    const { result } = await renderBiometrics();

    expect(result.current.available).toBe(false);
  });

  it('con reconocimiento facial usa el texto de rostro', async () => {
    supportedAuthenticationTypesAsync.mockResolvedValue([AuthenticationType.FACIAL_RECOGNITION]);
    const { result } = await renderBiometrics();

    expect(result.current).toMatchObject({ kind: 'face', noun: 'rostro' });
  });

  it('si la librería falla cuenta como sin biometría y la app arranca igual', async () => {
    hasHardwareAsync.mockRejectedValue(new Error('boom'));
    const { result } = await renderBiometrics();

    expect(result.current).toMatchObject({ ready: true, available: false });
  });

  it('al volver a primer plano vuelve a leer el sistema (se enroló una huella desde Ajustes)', async () => {
    isEnrolledAsync.mockResolvedValue(false);
    const { result } = await renderBiometrics();
    expect(result.current.available).toBe(false);

    isEnrolledAsync.mockResolvedValue(true);
    await goTo('active');

    await waitFor(() => expect(result.current.available).toBe(true));
  });

  it('si al volver a primer plano la librería falla, conserva la capacidad anterior y el bloqueo sigue vigente', async () => {
    store.set(PREFERENCE_KEY, '1');
    const { result } = await renderBiometrics();
    expect(result.current).toMatchObject({ available: true, enabled: true, locked: true });

    hasHardwareAsync.mockRejectedValue(new Error('boom'));
    await goTo('active');
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toMatchObject({ available: true, enabled: true, locked: true });
  });

  it('si la lectura falla en el arranque la reintenta una vez antes de rendirse', async () => {
    store.set(PREFERENCE_KEY, '1');
    hasHardwareAsync.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderBiometrics();

    expect(hasHardwareAsync).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ available: true, enabled: true, locked: true });
  });

  it('desuscribe el listener de AppState al desmontar', async () => {
    const { unmount } = await renderBiometrics();
    unmount();

    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('useBiometrics fuera del provider lanza un error claro', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useBiometrics())).toThrow(
      'useBiometrics debe usarse dentro de un BiometricsProvider'
    );
  });
});

describe('BiometricsProvider · bloqueo de arranque', () => {
  it('con la preferencia activada y biometría disponible, la app abre bloqueada', async () => {
    store.set(PREFERENCE_KEY, '1');
    const { result } = await renderBiometrics();

    expect(result.current).toMatchObject({ enabled: true, locked: true });
  });

  it('si la preferencia quedó activada pero ya no hay biometría enrolada, no bloquea (no deja a nadie afuera)', async () => {
    store.set(PREFERENCE_KEY, '1');
    isEnrolledAsync.mockResolvedValue(false);
    const { result } = await renderBiometrics();

    expect(result.current).toMatchObject({ enabled: false, locked: false });
  });

  it('si con la app bloqueada desaparece la biometría enrolada, el bloqueo se levanta (decisión documentada)', async () => {
    store.set(PREFERENCE_KEY, '1');
    const { result } = await renderBiometrics();
    expect(result.current.locked).toBe(true);

    isEnrolledAsync.mockResolvedValue(false);
    await goTo('active');

    await waitFor(() => expect(result.current).toMatchObject({ available: false, enabled: false, locked: false }));
  });

  it('unlock con éxito libera el bloqueo, pide solo biometría (sin PIN) y renueva el desbloqueo sensible', async () => {
    store.set(PREFERENCE_KEY, '1');
    const { result } = await renderBiometrics();

    let outcome;
    await act(async () => {
      outcome = await result.current.unlock();
    });

    expect(outcome).toBe('success');
    expect(result.current.locked).toBe(false);
    expect(result.current.isSensitiveUnlocked()).toBe(true);
    expect(authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Ingresá a Omni', disableDeviceFallback: true, fallbackLabel: '' })
    );
  });

  it('cancelar deja el bloqueo puesto', async () => {
    store.set(PREFERENCE_KEY, '1');
    authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
    const { result } = await renderBiometrics();

    let outcome;
    await act(async () => {
      outcome = await result.current.unlock();
    });

    expect(outcome).toBe('cancelled');
    expect(result.current.locked).toBe(true);
  });

  it('una falla de reconocimiento deja el bloqueo puesto', async () => {
    store.set(PREFERENCE_KEY, '1');
    authenticateAsync.mockResolvedValue({ success: false, error: 'authentication_failed' });
    const { result } = await renderBiometrics();

    let outcome;
    await act(async () => {
      outcome = await result.current.unlock();
    });

    expect(outcome).toBe('failed');
    expect(result.current.locked).toBe(true);
  });

  it('si la librería lanza, es una falla y no rompe', async () => {
    store.set(PREFERENCE_KEY, '1');
    authenticateAsync.mockRejectedValue(new Error('boom'));
    const { result } = await renderBiometrics();

    let outcome;
    await act(async () => {
      outcome = await result.current.unlock();
    });

    expect(outcome).toBe('failed');
    expect(result.current.locked).toBe(true);
  });

  it('markUnlocked (login con contraseña) libera el bloqueo sin pedir biometría', async () => {
    store.set(PREFERENCE_KEY, '1');
    const { result } = await renderBiometrics();

    act(() => result.current.markUnlocked());

    expect(result.current.locked).toBe(false);
    expect(authenticateAsync).not.toHaveBeenCalled();
  });

  it('dos pedidos a la vez comparten un solo prompt', async () => {
    store.set(PREFERENCE_KEY, '1');
    let finish!: () => void;
    authenticateAsync.mockReturnValue(new Promise(resolve => (finish = () => resolve({ success: true }))));
    const { result } = await renderBiometrics();

    let first!: Promise<string>;
    let second!: Promise<string>;
    act(() => {
      first = result.current.unlock();
      second = result.current.unlock();
    });
    await act(async () => finish());

    expect(authenticateAsync).toHaveBeenCalledTimes(1);
    expect(await first).toBe('success');
    expect(await second).toBe('success');
  });

  it('un pedido solo biométrico no se une a un prompt abierto que permite el PIN: espera y abre el suyo', async () => {
    store.set(PREFERENCE_KEY, '1');
    let finishSensitive!: () => void;
    authenticateAsync
      .mockReturnValueOnce(new Promise(resolve => (finishSensitive = () => resolve({ success: true }))))
      .mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    const { result } = await renderBiometrics();

    let sensitive!: Promise<string>;
    let unlocking!: Promise<string>;
    act(() => {
      sensitive = result.current.authenticateSensitive();
      unlocking = result.current.unlock();
    });
    expect(authenticateAsync).toHaveBeenCalledTimes(1);

    await act(async () => finishSensitive());

    expect(await sensitive).toBe('success');
    expect(await unlocking).toBe('cancelled');
    expect(authenticateAsync).toHaveBeenCalledTimes(2);
    expect(authenticateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ promptMessage: 'Ingresá a Omni', disableDeviceFallback: true })
    );
  });
});

describe('BiometricsProvider · activar y desactivar', () => {
  it('activar pide una verificación biométrica y recién después guarda la preferencia', async () => {
    const { result } = await renderBiometrics();

    let outcome;
    await act(async () => {
      outcome = await result.current.enable();
    });

    expect(outcome).toBe('success');
    expect(authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Activá el ingreso con huella', disableDeviceFallback: true })
    );
    expect(store.get(PREFERENCE_KEY)).toBe('1');
    expect(result.current.enabled).toBe(true);
    expect(result.current.locked).toBe(false);
  });

  it('el texto del prompt se adapta al rostro', async () => {
    supportedAuthenticationTypesAsync.mockResolvedValue([AuthenticationType.FACIAL_RECOGNITION]);
    const { result } = await renderBiometrics();
    await act(async () => {
      await result.current.enable();
    });

    expect(authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Activá el ingreso con rostro' })
    );
  });

  it.each([
    ['se cancela', { success: false, error: 'user_cancel' }, 'cancelled'],
    ['falla', { success: false, error: 'authentication_failed' }, 'failed'],
  ] as const)('si la verificación %s, no se guarda nada', async (_name, authResult, expected) => {
    authenticateAsync.mockResolvedValue(authResult);
    const { result } = await renderBiometrics();

    let outcome;
    await act(async () => {
      outcome = await result.current.enable();
    });

    expect(outcome).toBe(expected);
    expect(store.has(PREFERENCE_KEY)).toBe(false);
    expect(result.current.enabled).toBe(false);
  });

  it('si no se puede guardar la preferencia, falla y no queda activada', async () => {
    secure.setItemAsync.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderBiometrics();

    let outcome;
    await act(async () => {
      outcome = await result.current.enable();
    });

    expect(outcome).toBe('failed');
    expect(result.current.enabled).toBe(false);
  });

  it('sin biometría disponible no pide nada y devuelve falla', async () => {
    hasHardwareAsync.mockResolvedValue(false);
    const { result } = await renderBiometrics();

    let outcome;
    await act(async () => {
      outcome = await result.current.enable();
    });

    expect(outcome).toBe('failed');
    expect(authenticateAsync).not.toHaveBeenCalled();
  });

  it('desactivar borra la preferencia y quita el bloqueo, sin pedir verificación', async () => {
    store.set(PREFERENCE_KEY, '1');
    const { result } = await renderBiometrics();
    await act(async () => result.current.disable());

    expect(store.has(PREFERENCE_KEY)).toBe(false);
    expect(result.current).toMatchObject({ enabled: false, locked: false });
    expect(authenticateAsync).not.toHaveBeenCalled();
  });

  it('si no se puede borrar la preferencia, desactivar propaga el error y sigue activada', async () => {
    store.set(PREFERENCE_KEY, '1');
    secure.deleteItemAsync.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderBiometrics();

    await expect(act(async () => result.current.disable())).rejects.toThrow('boom');
    expect(result.current.enabled).toBe(true);
  });
});

describe('BiometricsProvider · módulos sensibles', () => {
  it('al arrancar no hay desbloqueo vigente', async () => {
    const { result } = await renderBiometrics();

    expect(result.current.isSensitiveUnlocked()).toBe(false);
  });

  it('si la app pasa por background mientras el prompt está abierto, el éxito no renueva el desbloqueo', async () => {
    let finish!: () => void;
    authenticateAsync.mockReturnValue(new Promise(resolve => (finish = () => resolve({ success: true }))));
    const { result } = await renderBiometrics();

    let pendingResult!: Promise<string>;
    act(() => {
      pendingResult = result.current.authenticateSensitive();
    });
    await goTo('background');
    await act(async () => finish());

    expect(await pendingResult).toBe('success');
    expect(result.current.isSensitiveUnlocked()).toBe(false);
  });

  it('un desbloqueo exitoso vale hasta el tope y deja de valer pasados los minutos', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const { result } = await renderBiometrics();

    await act(async () => {
      await result.current.authenticateSensitive();
    });
    expect(result.current.isSensitiveUnlocked()).toBe(true);

    now.mockReturnValue(1_000_000 + SENSITIVE_UNLOCK_TTL_MS);
    expect(result.current.isSensitiveUnlocked()).toBe(true);

    now.mockReturnValue(1_000_000 + SENSITIVE_UNLOCK_TTL_MS + 1);
    expect(result.current.isSensitiveUnlocked()).toBe(false);
  });

  it('en los módulos sensibles se permite el PIN del teléfono como alternativa', async () => {
    const { result } = await renderBiometrics();
    await act(async () => {
      await result.current.authenticateSensitive();
    });

    expect(authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Desbloqueá este módulo', disableDeviceFallback: false })
    );
  });

  it.each([
    ['se cancela', { success: false, error: 'user_cancel' }],
    ['falla', { success: false, error: 'lockout' }],
  ] as const)('si la verificación %s, no se desbloquea', async (_name, authResult) => {
    authenticateAsync.mockResolvedValue(authResult);
    const { result } = await renderBiometrics();
    await act(async () => {
      await result.current.authenticateSensitive();
    });

    expect(result.current.isSensitiveUnlocked()).toBe(false);
  });

  it('al mandar la app a background se pierde el desbloqueo y cambia la época para avisar a los gates', async () => {
    const { result } = await renderBiometrics();
    await act(async () => {
      await result.current.authenticateSensitive();
    });
    const epoch = result.current.sensitiveEpoch;

    await goTo('background');

    expect(result.current.isSensitiveUnlocked()).toBe(false);
    expect(result.current.sensitiveEpoch).toBe(epoch + 1);
  });

  it('pasar por inactive (el prompt de Face ID en iOS) no pierde el desbloqueo', async () => {
    const { result } = await renderBiometrics();
    await act(async () => {
      await result.current.authenticateSensitive();
    });

    await goTo('inactive');

    expect(result.current.isSensitiveUnlocked()).toBe(true);
  });

  it('un login con contraseña también cuenta como desbloqueo', async () => {
    const { result } = await renderBiometrics();
    act(() => result.current.markUnlocked());

    expect(result.current.isSensitiveUnlocked()).toBe(true);
  });
});
