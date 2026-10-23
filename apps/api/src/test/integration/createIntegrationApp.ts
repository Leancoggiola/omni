import { createApp } from '../../app';

/**
 * Es `createApp()` tal cual: los tests ejercitan el mismo stack que producción, passport incluido.
 * El rate limiter se apaga con `RATE_LIMIT_DISABLED` (lo fija `.env.test`, que carga `setupIntegrationEnv` con `loadTestEnv`) porque toda la suite sale desde
 * la misma IP y lo agotaría. El origin guard queda montado pero sin `ORIGIN_SECRET` no actúa; su lógica se cubre con
 * tests unitarios.
 */
export function createIntegrationApp() {
  return createApp();
}
