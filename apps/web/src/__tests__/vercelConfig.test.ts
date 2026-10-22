import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface VercelRoute {
  src?: string;
  dest?: string;
  handle?: string;
  continue?: boolean;
  headers?: Record<string, string>;
  transforms?: { type: string; target?: { key: string }; args: string }[];
}

const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
  routes: VercelRoute[];
  headers?: unknown;
  rewrites?: unknown;
};

const routes = config.routes;
const headerRoute = routes.find(route => route.headers?.['Content-Security-Policy']);
const assetsRoute = routes.find(route => route.src === '/assets/(.*)' && route.headers);
const apiRoute = routes.find(route => route.src === '/api/(.*)');

describe('vercel.json', () => {
  it('no mezcla routes con headers ni rewrites', () => {
    expect(config.headers).toBeUndefined();
    expect(config.rewrites).toBeUndefined();
  });

  it('manda las cabeceras de seguridad en todo menos /api y sigue evaluando rutas', () => {
    expect(headerRoute?.continue).toBe(true);
    expect(new RegExp(`^${headerRoute?.src}$`).test('/')).toBe(true);
    expect(new RegExp(`^${headerRoute?.src}$`).test('/assets/index.js')).toBe(true);
    expect(new RegExp(`^${headerRoute?.src}$`).test('/api/health')).toBe(false);
    expect(new RegExp(`^${headerRoute?.src}$`).test('/api')).toBe(false);
    expect(new RegExp(`^${headerRoute?.src}$`).test('/apixyz')).toBe(true);
    expect(headerRoute?.headers).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
  });

  it('la CSP cubre fuentes, pósters, estilos de Mantine, API y framing', () => {
    const csp = headerRoute?.headers?.['Content-Security-Policy'] ?? '';
    const directives = Object.fromEntries(
      csp.split(';').map(part => {
        const [name, ...values] = part.trim().split(/\s+/);
        return [name, values];
      })
    );

    expect(directives['default-src']).toEqual(["'self'"]);
    expect(directives['script-src']).toEqual(["'self'"]);
    expect(directives['style-src']).toEqual(
      expect.arrayContaining(["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'])
    );
    expect(directives['font-src']).toEqual(["'self'", 'https://fonts.gstatic.com']);
    expect(directives['img-src']).toEqual(
      expect.arrayContaining(["'self'", 'data:', 'blob:', 'https://image.tmdb.org'])
    );
    expect(directives['connect-src']).toEqual(["'self'"]);
    expect(directives['frame-ancestors']).toEqual(["'none'"]);
    expect(directives['object-src']).toEqual(["'none'"]);
  });

  it('cachea /assets como inmutable y sigue evaluando rutas', () => {
    expect(assetsRoute?.continue).toBe(true);
    expect(assetsRoute?.headers?.['Cache-Control']).toBe('public, max-age=31536000, immutable');
  });

  it('conserva el proxy de /api con el secret de origen', () => {
    expect(apiRoute?.dest).toBe('https://omni-api-gwer.onrender.com/api/$1');
    expect(apiRoute?.transforms).toEqual([
      expect.objectContaining({ type: 'request.headers', target: { key: 'x-origin-secret' }, args: '$ORIGIN_SECRET' }),
    ]);
  });

  it('mantiene las cabeceras antes del proxy, el filesystem y el fallback SPA', () => {
    const indexOf = (route?: VercelRoute) => (route ? routes.indexOf(route) : -1);
    const filesystem = routes.findIndex(route => route.handle === 'filesystem');
    const fallback = routes.findIndex(route => route.dest === '/index.html');

    expect(indexOf(headerRoute)).toBeLessThan(indexOf(apiRoute));
    expect(indexOf(assetsRoute)).toBeLessThan(filesystem);
    expect(filesystem).toBeLessThan(fallback);
  });
});
