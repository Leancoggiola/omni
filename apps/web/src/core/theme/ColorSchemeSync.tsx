import { useEffect } from 'react';

import { suppressTransitionsForNextFrame } from './colorSchemeTransition';
import { useSyncColorScheme } from './useSyncColorScheme';

import type { FC } from 'react';

/**
 * Sincroniza el tema con la sesión en toda la app (también en /login, fuera de `RootLayout`) y, cuando cambia el
 * tema del sistema, apaga las transiciones CSS en ese cuadro: Mantine lo aplica desde su propio listener sin
 * apagarlas, y los inputs animaban el borde mientras el resto cambiaba de golpe. Va dentro de `AuthProvider`.
 */
export const ColorSchemeSync: FC = () => {
  useSyncColorScheme();

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    media.addEventListener('change', suppressTransitionsForNextFrame);
    return () => media.removeEventListener('change', suppressTransitionsForNextFrame);
  }, []);

  return null;
};
