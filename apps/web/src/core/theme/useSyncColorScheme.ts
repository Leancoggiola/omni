import { useEffect, useRef } from 'react';
import { useMantineColorScheme } from '@mantine/core';

import { useAuth } from '@/core/auth';

import { getSessionColorScheme } from './sessionColorScheme';

/**
 * Aplica el tema del perfil al iniciar sesión, salvo que el usuario lo haya cambiado con el toggle
 * en esta sesión. El override se descarta en `logout` / fallo de auth (ver AuthContext).
 */
export function useSyncColorScheme() {
  const { user } = useAuth();
  const { setColorScheme } = useMantineColorScheme();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (syncedRef.current) return;
    if (!user) return;

    setColorScheme(getSessionColorScheme() ?? user.theme);
    syncedRef.current = true;
  }, [user, setColorScheme]);
}
