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
import { isStartupUnlocked, markStartupUnlocked } from './startupUnlock';

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
 * Lee del sistema si hay biometría usable (hardware y al menos una huella o rostro enrolado) y de qué tipo. Devuelve
 * `null` si la librería falla, para que quien llama distinga "sin biometría" de "no se pudo saber": en el arranque un
 * fallo cuenta como "sin biometría" (no debe dejar a nadie fuera de la app) pero al volver a primer plano se conserva
 * la capacidad anterior, así un error transitorio no desbloquea una sesión viva.
 */
async function readCapability(): Promise<Capability | null> {
  try {
    const [hardware, enrolled] = await Promise.all([hasHardwareAsync(), isEnrolledAsync()]);
    if (!hardware || !enrolled) return NO_CAPABILITY;
    return { available: true, kind: detectBiometricKind(await supportedAuthenticationTypesAsync()) };
  } catch {
    return null;
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
 *   lo libera después de un login con contraseña. Que ya se liberó se guarda fuera del provider (`startupUnlock`),
 *   porque expo-router lo vuelve a montar al redirigir a las tabs y no debe volver a bloquear hasta un arranque en frío.
 * - **Módulos sensibles** (`isSensitiveUnlocked`, `authenticateSensitive`): vale `SENSITIVE_UNLOCK_TTL_MS` desde el
 *   último desbloqueo y se pierde al mandar la app a background (`sensitiveEpoch` cambia para avisar a los gates
 *   montados). Cualquier desbloqueo, activación o login con contraseña lo renueva.
 *
 * Decisión de producto: el bloqueo es solo de arranque en frío (la app "abre bloqueada"). Al volver de background no se
 * vuelve a bloquear la app entera: solo se invalida el desbloqueo de los módulos sensibles (`SensitiveGate`), que son
 * los que piden biometría de nuevo.
 *
 * Decisión de seguridad (arranque): si la lectura del sistema falla, se reintenta una vez; si vuelve a fallar cuenta
 * como "sin biometría" y la app abre sin bloqueo, porque un error de la librería no debe dejar a nadie afuera. Al volver
 * a primer plano un fallo, en cambio, conserva la capacidad anterior.
 *
 * Decisión de seguridad: el bloqueo depende de que haya biometría enrolada. Si desaparece (por ejemplo se borra la
 * última huella, algo que el sistema solo permite tras autenticar al dueño del teléfono), `locked` pasa a `false` y la
 * app abre sin desbloqueo, en vez de mostrar un botón biométrico que ya no puede funcionar. Nadie queda afuera y la
 * sesión sigue siendo la que guardó el login con contraseña.
 *
 * Los prompts son de a uno: pedir otro con la misma política de PIN mientras hay uno abierto devuelve el mismo
 * resultado; si la política difiere, espera a que termine el abierto y recién ahí abre el suyo, así un prompt solo
 * biométrico nunca se resuelve con el PIN del teléfono. `disableDeviceFallback` deja solo la biometría (la alternativa
 * en el login es el campo de contraseña de la cuenta); en los módulos sensibles se permite el PIN o patrón del
 * teléfono, que ahí hace de alternativa.
 *
 * Si la app pasa por background mientras hay un prompt abierto, un éxito posterior no renueva el desbloqueo sensible
 * (el prompt empezó en una época anterior): hay que volver a pedirlo. `enable` pide una verificación biométrica antes de
 * guardar la preferencia, así no queda activada una biometría que no funciona, y como la persona acaba de verificarse
 * no se bloquea la app en esta sesión. Si falla el guardado en SecureStore, `enable` lanza el error (no devuelve
 * `'failed'`, que es solo "no se pudo verificar") para que quien llama avise que no se guardó la preferencia.
 */
export const BiometricsProvider: FC<PropsWithChildren> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [capability, setCapability] = useState<Capability>(NO_CAPABILITY);
  const [preference, setPreference] = useState(false);
  const [lockedAtStart, setLockedAtStart] = useState(false);
  const [sensitiveEpoch, setSensitiveEpoch] = useState(0);
  const unlockedAt = useRef<number | null>(null);
  const epochRef = useRef(0);
  const pending = useRef<{ promise: Promise<BiometricResult>; allowDeviceFallback: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [first, saved] = await Promise.all([readCapability(), getBiometricEnabled()]);
      const next = first ?? (await readCapability());
      if (cancelled) return;
      const initial = next ?? NO_CAPABILITY;
      setCapability(initial);
      setPreference(saved);
      setLockedAtStart(saved && initial.available && !isStartupUnlocked());
      setReady(true);
    })();

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') {
        unlockedAt.current = null;
        epochRef.current += 1;
        setSensitiveEpoch(epoch => epoch + 1);
      } else if (state === 'active') {
        void readCapability().then(next => {
          if (!cancelled && next) setCapability(next);
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

  const prompt = useCallback(async (promptMessage: string, allowDeviceFallback: boolean): Promise<BiometricResult> => {
    while (pending.current) {
      const current = pending.current;
      if (current.allowDeviceFallback === allowDeviceFallback) return current.promise;
      await current.promise;
    }
    const promise = authenticateAsync({
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
    pending.current = { promise, allowDeviceFallback };
    return promise;
  }, []);

  const markUnlocked = useCallback(() => {
    unlockedAt.current = Date.now();
    markStartupUnlocked();
    setLockedAtStart(false);
  }, []);

  const renewSensitive = useCallback((epochAtStart: number) => {
    if (epochRef.current === epochAtStart) unlockedAt.current = Date.now();
  }, []);

  const unlock = useCallback(async () => {
    const epochAtStart = epochRef.current;
    const result = await prompt('Ingresá a Omni', false);
    if (result === 'success') {
      renewSensitive(epochAtStart);
      markStartupUnlocked();
      setLockedAtStart(false);
    }
    return result;
  }, [prompt, renewSensitive]);

  const authenticateSensitive = useCallback(async () => {
    const epochAtStart = epochRef.current;
    const result = await prompt('Desbloqueá este módulo', true);
    if (result === 'success') renewSensitive(epochAtStart);
    return result;
  }, [prompt, renewSensitive]);

  const enable = useCallback(async () => {
    if (!available) return 'failed';
    const epochAtStart = epochRef.current;
    const result = await prompt(`Activá el ingreso con ${noun}`, false);
    if (result !== 'success') return result;
    await setBiometricEnabled(true);
    markStartupUnlocked();
    setPreference(true);
    renewSensitive(epochAtStart);
    return 'success';
  }, [available, noun, prompt, renewSensitive]);

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
