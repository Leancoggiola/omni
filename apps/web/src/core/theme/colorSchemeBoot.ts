export const SESSION_COLOR_SCHEME_KEY = 'omni-session-color-scheme';
export const COLOR_SCHEME_HINT_KEY = 'omni-color-scheme-hint';

/**
 * Script inline que `vite.config.ts` inyecta en el `<head>` de `index.html`: corre antes del primer pintado y pone
 * `data-mantine-color-scheme`, que es lo que activa las variables de color de Mantine. Sin él, el documento se pinta
 * sin fondo (blanco) hasta que monta React. Resuelve igual que la app: el override de la sesión, si no el tema del
 * perfil de la última sesión (la pista de `colorSchemeHint`) y, con `auto` o sin pista, el del sistema. No importa
 * nada a propósito: `vite.config.ts` lo lee al armar el HTML, fuera del bundle.
 */
export function colorSchemeBootScript(): string {
  const session = JSON.stringify(SESSION_COLOR_SCHEME_KEY);
  const hint = JSON.stringify(COLOR_SCHEME_HINT_KEY);
  return [
    '(function(){',
    'function read(s,k){try{return s.getItem(k)}catch(e){return null}}',
    `var v=read(sessionStorage,${session});`,
    `if(v!=='light'&&v!=='dark')v=read(localStorage,${hint});`,
    "if(v!=='light'&&v!=='dark')v=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';",
    "document.documentElement.setAttribute('data-mantine-color-scheme',v);",
    '})();',
  ].join('');
}
