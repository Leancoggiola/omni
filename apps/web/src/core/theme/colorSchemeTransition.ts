import { flushSync } from 'react-dom';

const DISABLE_TRANSITIONS_CSS = '*, *::before, *::after { transition: none !important; }';

/**
 * Cambia el tema con un fundido entre la pantalla vieja y la nueva (View Transitions API; la animación por defecto
 * del navegador dura 250 ms, igual que `THEME_FADE_MS` de mobile). `apply` corre dentro de `flushSync` para que el
 * navegador capture la pantalla nueva ya renderizada. Sin la API o con movimiento reducido, el cambio es instantáneo.
 */
export function runColorSchemeTransition(apply: () => void): void {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (reduceMotion || typeof document.startViewTransition !== 'function') {
    apply();
    return;
  }
  document.startViewTransition(() => flushSync(apply));
}

/**
 * Apaga las transiciones CSS hasta después del próximo cuadro, para que un cambio de tema que no pasa por
 * `setColorScheme` de Mantine (el del sistema, con el tema en `auto`) no anime algunos componentes y otros no.
 */
export function suppressTransitionsForNextFrame(): void {
  const style = document.createElement('style');
  style.setAttribute('data-omni-disable-transitions', 'true');
  style.textContent = DISABLE_TRANSITIONS_CSS;
  document.head.appendChild(style);
  requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
}
