import { SPACING } from '@omni/shared/theme';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { YStack } from 'tamagui';

import { useAuth } from '@/core/auth';
import { useBiometrics } from '@/core/biometrics';
import { useLaunchDeadline, useLaunchDestination } from '@/core/launch';
import { useSemanticColors } from '@/core/theme';
import { Button, ErrorState, notifyError, Spinner } from '@/shared/ui';

export const SESSION_ERROR_MESSAGE = 'No pudimos verificar tu sesión. Intentá de nuevo.';
export const SESSION_ROUTES = ['(tabs)', 'profile', 'admin', 'gym/index', 'gym/plans', 'gym/reorder'];

/**
 * Decide qué ve la persona según la sesión: spinner mientras se verifica, login sin sesión y la app con sesión.
 * Si hay token pero la sesión no se pudo verificar (sin red, API caída, timeout) muestra un `ErrorState` con
 * reintento en vez de mandar al login: los tokens siguen guardados y la sesión puede seguir siendo válida. "Cerrar
 * sesión" es la salida si la API sigue fallando (limpia la sesión local aunque el servidor no responda). Va antes
 * que el spinner porque los reintentos automáticos de SWR vuelven a poner `isLoading` mientras dura cada uno.
 *
 * El acceso lo dan las rutas protegidas de expo-router (`Stack.Protected`): con sesión están `SESSION_ROUTES` y sin
 * ella solo `login`; al cambiar la guarda, el router pasa solo a la primera ruta disponible (las tabs o el login).
 * No se redirige con `<Redirect>` sin un navegador montado porque expo-router reemplaza entonces su ruta raíz y vuelve
 * a montar toda la app (#332). **Toda ruta nueva de `app/` que pida sesión va en `SESSION_ROUTES`**: una que no esté
 * queda abierta sin sesión (un test compara la lista con `app/`).
 *
 * Bloqueo biométrico (#173): con sesión pero `locked` (biometría activada y todavía sin desbloquear en este arranque)
 * solo está el login, que ofrece la huella o el rostro y la contraseña; al desbloquear se pasa a las tabs. Hasta leer
 * la preferencia (`biometricsReady`) se muestra el spinner, así la app no se ve ni un instante antes de bloquearse.
 *
 * Arranque (#332): avisa a la animación que puede cerrar cuando queda en el `ErrorState` o en las rutas con sesión.
 * En el login lo avisa `LoginScreen`, cuando termina de leer el usuario recordado. Con la sesión y la biometría
 * resueltas corre además el tope de `useLaunchDeadline`, por si ninguna pantalla avisa.
 */
export function AuthGate() {
  const { isAuthenticated, isLoading, isSessionUnverified, isRetryingSession, retrySession, logout } = useAuth();
  const { ready: biometricsReady, locked } = useBiometrics();
  const colors = useSemanticColors();
  const [loggingOut, setLoggingOut] = useState(false);
  const open = isAuthenticated && !locked;

  const settled = !isLoading && biometricsReady;

  useLaunchDestination(isSessionUnverified || (settled && open));
  useLaunchDeadline(settled);

  if (isSessionUnverified) {
    return (
      <YStack flex={1} justifyContent="center" padding={SPACING.md} gap={SPACING.md} backgroundColor="background">
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

  if (isLoading || !biometricsReady) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.body } }}>
      <Stack.Protected guard={open}>
        {SESSION_ROUTES.map(name => (
          <Stack.Screen key={name} name={name} />
        ))}
      </Stack.Protected>
      <Stack.Protected guard={!open}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
