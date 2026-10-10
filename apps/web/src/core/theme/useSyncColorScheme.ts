import { useEffect, useRef } from 'react';
import { useMantineColorScheme } from '@mantine/core';

import { useAuth } from '@/core/auth';

import { getSessionColorScheme } from './sessionColorScheme';

/**
 * Aplica el tema del perfil al iniciar sesión, salvo que el usuario lo haya cambiado con el toggle
 * en esta sesión. El override se descarta al iniciar sesión (ver AuthContext).
 */
export function useSyncColorScheme() {
  const { user } = useAuth();
  const { setColorScheme } = useMantineColorScheme();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      // Logout o sesión vencida: con override, /login lo conserva (se descarta en el próximo login).
      // Sin override, vuelve al tema por defecto, igual que tras recargar.
      if (syncedRef.current) {
        syncedRef.current = false;
        if (!getSessionColorScheme()) setColorScheme('auto');
      }
      return;
    }
    if (syncedRef.current) return;

    setColorScheme(getSessionColorScheme() ?? user.theme);
    syncedRef.current = true;
  }, [user, setColorScheme]);
}
