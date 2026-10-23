import { useEffect, useRef } from 'react';
import { useMantineColorScheme } from '@mantine/core';

import { useAuth } from '@/core/auth';

import { getSessionColorScheme } from './sessionColorScheme';

import { resolveColorScheme } from '@omni/shared/theme';

/**
 * Aplica el tema del perfil al iniciar sesión, salvo que el usuario lo haya cambiado con el toggle
 * en esta sesión (`resolveColorScheme`; `auto` lo resuelve Mantine con el sistema). El override se
 * descarta al iniciar sesión (ver AuthContext).
 */
export function useSyncColorScheme() {
  const { user } = useAuth();
  const { setColorScheme } = useMantineColorScheme();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      if (syncedRef.current) {
        syncedRef.current = false;
        if (!getSessionColorScheme()) setColorScheme('auto');
      }
      return;
    }
    if (syncedRef.current) return;

    setColorScheme(resolveColorScheme({ override: getSessionColorScheme(), profileTheme: user.theme, system: 'auto' }));
    syncedRef.current = true;
  }, [user, setColorScheme]);
}
