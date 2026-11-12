import {
  authenticateAsync,
  hasHardwareAsync,
  isEnrolledAsync,
  supportedAuthenticationTypesAsync,
} from 'expo-local-authentication';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import { getBiometricEnabled, setBiometricEnabled } from '@/shared/api';

import {
  biometricNoun,
  detectBiometricKind,
  isUnlockFresh,
  toBiometricResult,
  type BiometricKind,
  type BiometricResult,
} from './biometrics';

interface BiometricsContextValue {
  ready: boolean;
  available: boolean;
  kind: BiometricKind;
  noun: string;
  enabled: boolean;
  locked: boolean;
  unlock: () => Promise<BiometricResult>;
  markUnlocked: () => void;
  enable: () => Promise<BiometricResult>;
  disable: () => Promise<void>;
  authenticateSensitive: () => Promise<BiometricResult>;
  isSensitiveUnlocked: () => boolean;
  sensitiveEpoch: number;
}

const BiometricsContext = createContext<BiometricsContextValue | null>(null);

type Capability = { available: boolean; kind: BiometricKind };

const NO_CAPABILITY: Capability = { available: false, kind: 'generic' };

/**
 * Lee del sistema si hay biometría usable (hardware y al menos una huella o rostro enrolado) y de qué tipo. Un fallo
 * de la librería cuenta como "sin biometría": nunca debe romper el arranque ni dejar a nadie fuera de la app.
 */
async function readCapability(): Promise<Capability> {
  try {
    const [hardware, enrolled] = await Promise.all([hasHardwareAsync(), isEnrolledAsync()]);
    if (!hardware || !enrolled) return NO_CAPABILITY;
    return { available: true, kind: detectBiometricKind(await supportedAuthenticationTypesAsync()) };
  } catch {
    return NO_CAPABILITY;
  }
}

/**
 * Biometría del dispositivo (#173). La preferencia ("activada") es por dispositivo y vive en SecureStore
 * (`biometricPreference`); "disponible" sale del sistema y se vuelve a leer al volver a primer plano, así el toggle de
 * Perfil aparece o desaparece si se enrola o se borra una huella. `enabled` es preferencia y disponibilidad juntas.
 *
 * Hay dos usos, que no se pisan:
 * - **Bloqueo de arranque** (`locked`): con la biometría activada, la app abre bloqueada. Con sesión guardada, el
 *   `AuthGate` muestra el login (usuario recordado) y `unlock()` libera la sesión sin pedir la contraseña; esa
 *   sesión es la que ya guardó `tokenStorage`, la biometría no reemplaza la autenticación del servidor. `markUnlocked`
 *   lo libera después de un login con contraseña.
 * - **Módulos sensibles** (`isSensitiveUnlocked`, `authenticateSensitive`): vale `SENSITIVE_UNLOCK_TTL_MS` desde el
 *   último desbloqueo y se pierde al mandar la app a background (`sensitiveEpoch` cambia para avisar a los gates
 *   montados). Cualquier desbloqueo, activación o login con contraseña lo renueva.
 *
 * Los prompts son de a uno: pedir otro mientras hay uno abierto devuelve el mismo resultado.
 */
export const BiometricsProvider: FC<PropsWithChildren> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [capability, setCapability] = useState<Capability>(NO_CAPABILITY);
  const [preference, setPreference] = useState(false);
  const [lockedAtStart, setLockedAtStart] = useState(false);
  const [sensitiveEpoch, setSensitiveEpoch] = useState(0);
  const unlockedAt = useRef<number | null>(null);
  const pending = useRef<Promise<BiometricResult> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [next, saved] = await Promise.all([readCapability(), getBiometricEnabled()]);
      if (cancelled) return;
      setCapability(next);
      setPreference(saved);
      setLockedAtStart(saved && next.available);
      setReady(true);
    })();

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') {
        unlockedAt.current = null;
        setSensitiveEpoch(epoch => epoch + 1);
      } else if (state === 'active') {
        void readCapability().then(next => {
          if (!cancelled) setCapability(next);
        });
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const { available, kind } = capability;
  const enabled = preference && available;
  const locked = lockedAtStart && enabled;
  const noun = biometricNoun(kind);

  /**
   * `disableDeviceFallback` deja solo la biometría (la alternativa en el login es el campo de contraseña de la
   * cuenta); en los módulos sensibles se permite el PIN o patrón del teléfono, que ahí hace de alternativa.
   */
  const prompt = useCallback((promptMessage: string, allowDeviceFallback: boolean) => {
    pending.current ??= authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: !allowDeviceFallback,
      fallbackLabel: allowDeviceFallback ? undefined : '',
    })
      .then(toBiometricResult)
      .catch((): BiometricResult => 'failed')
      .finally(() => {
        pending.current = null;
      });
    return pending.current;
  }, []);

  const markUnlocked = useCallback(() => {
    unlockedAt.current = Date.now();
    setLockedAtStart(false);
  }, []);

  const unlock = useCallback(async () => {
    const result = await prompt('Ingresá a Omni', false);
    if (result === 'success') markUnlocked();
    return result;
  }, [prompt, markUnlocked]);

  const authenticateSensitive = useCallback(async () => {
    const result = await prompt('Desbloqueá este módulo', true);
    if (result === 'success') unlockedAt.current = Date.now();
    return result;
  }, [prompt]);

  /**
   * Pide una verificación biométrica antes de guardar la preferencia, así no queda activada una biometría que no
   * funciona. Como la persona acaba de verificarse, no se bloquea la app en esta sesión.
   */
  const enable = useCallback(async () => {
    if (!available) return 'failed';
    const result = await prompt(`Activá el ingreso con ${noun}`, false);
    if (result !== 'success') return result;
    try {
      await setBiometricEnabled(true);
    } catch {
      return 'failed';
    }
    setPreference(true);
    unlockedAt.current = Date.now();
    return 'success';
  }, [available, noun, prompt]);

  const disable = useCallback(async () => {
    await setBiometricEnabled(false);
    setPreference(false);
    setLockedAtStart(false);
  }, []);

  const isSensitiveUnlocked = useCallback(() => isUnlockFresh(unlockedAt.current, Date.now()), []);

  const value = useMemo(
    () => ({
      ready,
      available,
      kind,
      noun,
      enabled,
      locked,
      unlock,
      markUnlocked,
      enable,
      disable,
      authenticateSensitive,
      isSensitiveUnlocked,
      sensitiveEpoch,
    }),
    [
      ready,
      available,
      kind,
      noun,
      enabled,
      locked,
      unlock,
      markUnlocked,
      enable,
      disable,
      authenticateSensitive,
      isSensitiveUnlocked,
      sensitiveEpoch,
    ]
  );

  return <BiometricsContext.Provider value={value}>{children}</BiometricsContext.Provider>;
};

export const useBiometrics = (): BiometricsContextValue => {
  const ctx = useContext(BiometricsContext);
  if (!ctx) {
    throw new Error('useBiometrics debe usarse dentro de un BiometricsProvider');
  }
  return ctx;
};
