import { useEffect, useRef } from 'react';
import { useMantineColorScheme } from '@mantine/core';

import { useAuth } from '@/core/auth';

import { clearColorSchemeHint, getColorSchemeHint, setColorSchemeHint } from './colorSchemeHint';
import { getSessionColorScheme } from './sessionColorScheme';

import { resolveColorScheme } from '@omni/shared/theme';

/**
 * Aplica el tema del perfil al iniciar sesión, salvo que el usuario lo haya cambiado con el toggle en esta sesión
 * (`resolveColorScheme`; `auto` lo resuelve Mantine con el sistema). El override se descarta al iniciar sesión (ver
 * AuthContext). Con sesión, guarda el tema del perfil como pista del primer pintado (`colorSchemeHint`). Sin sesión
 * (logout, vencimiento o una pista de otra persona al recargar) borra la pista y vuelve al override o a `auto`;
 * mientras la sesión carga o no se pudo verificar no toca nada, así la pista sigue pintando.
 */
export function useSyncColorScheme() {
  const { user, isLoading, error } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (user) {
      if (getColorSchemeHint() !== user.theme) setColorSchemeHint(user.theme);
      if (syncedRef.current) return;
      setColorScheme(
        resolveColorScheme({ override: getSessionColorScheme(), profileTheme: user.theme, system: 'auto' })
      );
      syncedRef.current = true;
      return;
    }
    if (isLoading || error) return;

    syncedRef.current = false;
    clearColorSchemeHint();
    const next = getSessionColorScheme() ?? 'auto';
    if (next !== colorScheme) setColorScheme(next);
  }, [user, isLoading, error, colorScheme, setColorScheme]);
}
