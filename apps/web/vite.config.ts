import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';

/** WEB_PORT / API_PORT los define la suite E2E para correr varias copias a la vez; sin ellos, los de siempre. */
const webPort = process.env.WEB_PORT ? Number(process.env.WEB_PORT) : undefined;
const apiPort = process.env.API_PORT ?? '3000';

export default defineConfig({
  plugins: [react()],
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
