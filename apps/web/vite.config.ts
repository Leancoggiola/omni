import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// WEB_PORT / API_PORT los define la suite E2E para correr varias copias a la vez; sin ellos, los de siempre.
const webPort = process.env.WEB_PORT ? Number(process.env.WEB_PORT) : undefined;
const apiPort = process.env.API_PORT ?? '3000';

export default defineConfig({
  plugins: [svgr(), react()],
  resolve: {
    alias: {
      '@/app': path.resolve(__dirname, './src/app'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/core': path.resolve(__dirname, './src/core'),
      '@/layouts': path.resolve(__dirname, './src/layouts'),
      '@/theme': path.resolve(__dirname, './src/theme'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      '@': path.resolve(__dirname, './src'),
    },
  },
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
