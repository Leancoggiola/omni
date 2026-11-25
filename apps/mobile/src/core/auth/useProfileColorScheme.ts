import { useEffect, useState } from 'react';

import { clearColorSchemeHint, saveColorSchemeHint } from '@/shared/api';

import { useAuth } from './AuthContext';

import type { ProfileTheme } from '@omni/shared/users';

/**
 * Tema del perfil para `ColorSchemeProvider` (`null` sin sesión). Mientras la sesión se verifica al abrir la app usa
 * `initialHint`, el tema del perfil de la última sesión que `RootLayout` lee antes de ocultar la splash, así el
 * primer cuadro ya sale con el tema correcto (= script de `index.html` en web, #294). Guarda el tema del perfil de
 * cada sesión como pista y la borra al quedar sin sesión; con la sesión sin verificar no la toca.
 */
export function useProfileColorScheme(initialHint: ProfileTheme | null): ProfileTheme | null {
  const { user, isLoading, isSessionUnverified } = useAuth();
  const [booting, setBooting] = useState(true);
  const theme = user?.theme ?? null;

  if (booting && !isLoading) setBooting(false);

  useEffect(() => {
    if (theme) void saveColorSchemeHint(theme);
    else if (!isLoading && !isSessionUnverified) void clearColorSchemeHint();
  }, [theme, isLoading, isSessionUnverified]);

  return theme ?? (booting ? initialHint : null);
}
