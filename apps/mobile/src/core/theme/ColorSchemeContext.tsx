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
import { resolveColorScheme, SEMANTIC } from '@omni/shared/theme';

import type { ProfileTheme } from '@omni/shared/users';

type ColorScheme = 'light' | 'dark';

type ColorSchemeProviderProps = PropsWithChildren<{ profileTheme: ProfileTheme | null }>;

interface ColorSchemeContextValue {
  colorScheme: ColorScheme;
  toggle: () => void;
  clearOverride: () => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

/**
 * Tema efectivo (`resolveColorScheme`): el override del toggle pisa al del perfil mientras la app esté abierta.
 * `profileTheme` es el tema del perfil, o `null` sin sesión; quien monta el provider lo saca de la sesión
 * (así este módulo no depende de `core/auth`). Sin sesión o con tema `auto` se sigue el esquema del
 * sistema. El override se descarta al quedar sin sesión: logout, o refresh fallido (el client avisa vía
 * `setOnAuthFailure` y AuthProvider cierra la sesión), igual que en web.
 */
export const ColorSchemeProvider: FC<ColorSchemeProviderProps> = ({ profileTheme, children }) => {
  const systemScheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [override, setOverride] = useState<ColorScheme | null>(null);

  useEffect(() => {
    if (profileTheme === null) setOverride(null);
  }, [profileTheme]);

  const colorScheme = resolveColorScheme({ override, profileTheme, system: systemScheme });

  const toggle = useCallback(() => {
    setOverride(colorScheme === 'dark' ? 'light' : 'dark');
  }, [colorScheme]);

  const clearOverride = useCallback(() => setOverride(null), []);

  const value = useMemo(() => ({ colorScheme, toggle, clearOverride }), [colorScheme, toggle, clearOverride]);

  return <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>;
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
