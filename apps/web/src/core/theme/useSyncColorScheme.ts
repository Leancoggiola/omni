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
      // Logout o sesión vencida: el tema y el override quedan como estaban para que /login los
      // conserve; el próximo inicio de sesión descarta el override y aplica el del perfil.
      syncedRef.current = false;
      return;
    }
    if (syncedRef.current) return;

    setColorScheme(getSessionColorScheme() ?? user.theme);
    syncedRef.current = true;
  }, [user, setColorScheme]);
}
