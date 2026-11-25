import { defineConfig, type Plugin } from 'vite';

import { colorSchemeBootScript } from './src/core/theme/colorSchemeBoot';

import react from '@vitejs/plugin-react';

/** WEB_PORT / API_PORT los define la suite E2E para correr varias copias a la vez; sin ellos, los de siempre. */
const webPort = process.env.WEB_PORT ? Number(process.env.WEB_PORT) : undefined;
const apiPort = process.env.API_PORT ?? '3000';

/**
 * Pone el script de `colorSchemeBootScript` al final del `<head>`: aplica el tema antes del primer pintado, así
 * una recarga no muestra la página en blanco (o con el tema equivocado) hasta que monta React (#294).
 */
function colorSchemeBoot(): Plugin {
  return {
    name: 'omni-color-scheme-boot',
    transformIndexHtml: () => [{ tag: 'script', children: colorSchemeBootScript(), injectTo: 'head' }],
  };
}

export default defineConfig({
  plugins: [colorSchemeBoot(), react()],
  resolve: { tsconfigPaths: true },
  server: {
    ...(webPort ? { port: webPort, strictPort: true } : {}),
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
});
