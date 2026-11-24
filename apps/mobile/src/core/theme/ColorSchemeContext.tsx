import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FC,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { captureScreen, releaseCapture } from 'react-native-view-shot';
import { resolveColorScheme, SEMANTIC } from '@omni/shared/theme';

import type { ProfileTheme } from '@omni/shared/users';

import { ThemeSnapshotFade } from './ThemeSnapshotFade';

type ColorScheme = 'light' | 'dark';

type ColorSchemeProviderProps = PropsWithChildren<{ profileTheme: ProfileTheme | null }>;

interface ColorSchemeContextValue {
  colorScheme: ColorScheme;
  selectedScheme: ColorScheme;
  toggle: () => void;
  clearOverride: () => void;
}

interface SnapshotFade {
  uri: string;
  to: ColorScheme;
}

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

/**
 * Tema efectivo (`resolveColorScheme`): el override del toggle pisa al del perfil mientras la app esté abierta.
 * `profileTheme` es el tema del perfil, o `null` sin sesión; quien monta el provider lo saca de la sesión
 * (así este módulo no depende de `core/auth`). Sin sesión o con tema `auto` se sigue el esquema del
 * sistema. El override se descarta al quedar sin sesión: logout, o refresh fallido (el client avisa vía
 * `setOnAuthFailure` y AuthProvider cierra la sesión), igual que en web.
 *
 * Cambio de tema con fundido (#294, = View Transitions de web): el tema que se ve (`colorScheme`) va un paso atrás
 * del resuelto. Cuando el resuelto cambia (toggle, Perfil, sistema, login) se captura la pantalla, la captura tapa
 * todo (`ThemeSnapshotFade`), recién entonces se aplica el tema nuevo y la captura se desvanece. Si la captura falla
 * el cambio es instantáneo, y con movimiento reducido no hay fundido. `selectedScheme` es el resuelto: lo usan los
 * controles del tema (el Switch de "Más") para responder al toque sin esperar la captura. La captura va en JPG: en
 * PNG tardaba ~250 ms más en el emulador.
 */
export const ColorSchemeProvider: FC<ColorSchemeProviderProps> = ({ profileTheme, children }) => {
  const systemScheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const reduceMotion = useReducedMotion();
  const [override, setOverride] = useState<ColorScheme | null>(null);

  if (profileTheme === null && override !== null) setOverride(null);

  const target = resolveColorScheme({ override, profileTheme, system: systemScheme });
  const [shown, setShown] = useState<ColorScheme>(target);
  const [fade, setFade] = useState<SnapshotFade | null>(null);

  if (reduceMotion && shown !== target) setShown(target);

  useEffect(() => {
    if (reduceMotion || fade || target === shown) return;
    let cancelled = false;
    captureScreen({ format: 'jpg', quality: 0.9 }).then(
      uri => {
        if (cancelled) releaseCapture(uri);
        else setFade({ uri, to: target });
      },
      () => {
        if (!cancelled) setShown(target);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [reduceMotion, fade, target, shown]);

  const showTarget = useCallback(() => {
    if (fade) setShown(fade.to);
  }, [fade]);

  const endFade = useCallback(() => {
    if (fade) releaseCapture(fade.uri);
    setFade(null);
  }, [fade]);

  const toggle = useCallback(() => {
    setOverride(target === 'dark' ? 'light' : 'dark');
  }, [target]);

  const clearOverride = useCallback(() => setOverride(null), []);

  const value = useMemo(
    () => ({ colorScheme: shown, selectedScheme: target, toggle, clearOverride }),
    [shown, target, toggle, clearOverride]
  );

  return (
    <ColorSchemeContext.Provider value={value}>
      {children}
      {fade && (
        <ThemeSnapshotFade
          key={fade.uri}
          uri={fade.uri}
          start={shown === fade.to}
          onLoad={showTarget}
          onDone={endFade}
        />
      )}
    </ColorSchemeContext.Provider>
  );
};

export const useColorSchemeControl = (): ColorSchemeContextValue => {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) {
    throw new Error('useColorSchemeControl debe usarse dentro de un ColorSchemeProvider');
  }
  return ctx;
};

/**
 * Colores semánticos (`SEMANTIC` de `@omni/shared/theme`) del esquema activo, tipados. Para valores
 * crudos que Tamagui no resuelve con `$token`: color de íconos, gradientes, etc.
 */
export const useSemanticColors = () => SEMANTIC[useColorSchemeControl().colorScheme];
