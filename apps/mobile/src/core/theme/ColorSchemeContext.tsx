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

import { useAuth } from '@/core/auth';

type ColorScheme = 'light' | 'dark';

interface ColorSchemeContextValue {
  colorScheme: ColorScheme;
  toggle: () => void;
  clearOverride: () => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

/**
 * Tema efectivo: el override del toggle pisa al del perfil mientras la app esté abierta.
 * Sin sesión o con tema `auto` se sigue el esquema del sistema. El override se descarta al
 * quedar sin usuario: logout, o refresh fallido (el client avisa vía `setOnAuthFailure` y
 * AuthProvider cierra la sesión), igual que en web.
 */
export const ColorSchemeProvider: FC<PropsWithChildren> = ({ children }) => {
  const { user } = useAuth();
  const systemScheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [override, setOverride] = useState<ColorScheme | null>(null);

  useEffect(() => {
    if (!user) setOverride(null);
  }, [user]);

  const profileScheme = !user || user.theme === 'auto' ? systemScheme : user.theme;
  const colorScheme = override ?? profileScheme;

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
