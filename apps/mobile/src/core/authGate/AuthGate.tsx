import { SPACING } from '@omni/shared/theme';
import { Redirect, Stack, useSegments } from 'expo-router';
import { useState } from 'react';
import { YStack } from 'tamagui';

import { useAuth } from '@/core/auth';
import { useSemanticColors } from '@/core/theme';
import { Button, ErrorState, notifyError, Spinner } from '@/shared/ui';

export const SESSION_ERROR_MESSAGE = 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.';

/**
 * Decide qué ve la persona según la sesión: spinner mientras se verifica, login sin sesión y la app con sesión.
 * Si hay token pero la sesión no se pudo verificar (sin red, API caída, timeout) muestra un `ErrorState` con
 * reintento en vez de mandar al login: los tokens siguen guardados y la sesión puede seguir siendo válida. "Cerrar
 * sesión" es la salida si la API sigue fallando (limpia la sesión local aunque el servidor no responda). Va antes
 * que el spinner porque los reintentos automáticos de SWR vuelven a poner `isLoading` mientras dura cada uno.
 */
export function AuthGate() {
  const { isAuthenticated, isLoading, isSessionUnverified, isRetryingSession, retrySession, logout } = useAuth();
  const colors = useSemanticColors();
  const segments = useSegments();
  const [loggingOut, setLoggingOut] = useState(false);
  const onLogin = segments[0] === 'login';

  if (isSessionUnverified) {
    return (
      <YStack flex={1} justifyContent="center" padding={SPACING.md} gap={SPACING.md} backgroundColor="$background">
        <ErrorState message={SESSION_ERROR_MESSAGE} onRetry={retrySession} retrying={isRetryingSession} />
        <Button
          fullWidth
          variant="subtle"
          loading={loggingOut}
          onPress={() => {
            setLoggingOut(true);
            void logout()
              .catch(() => notifyError('No se pudo cerrar la sesión'))
              .finally(() => setLoggingOut(false));
          }}
        >
          Cerrar sesión
        </Button>
      </YStack>
    );
  }

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  if (!isAuthenticated && !onLogin) {
    return <Redirect href="/login" />;
  }

  if (isAuthenticated && onLogin) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.body } }} />;
}
