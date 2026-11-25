import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const lockfile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../pnpm-lock.yaml');

/**
 * pnpm comparte en `node_modules/.pnpm/node_modules` una sola versión de `@types/react`, y con dos en el lockfile cuál
 * queda cambia entre instalaciones. Los paquetes que no declaran esa dependencia mezclan entonces dos copias de los
 * tipos y `check-types` falla a veces.
 */
describe('tipos de React', () => {
  it('el lockfile resuelve una sola versión de @types/react', () => {
    const versions = [...fs.readFileSync(lockfile, 'utf8').matchAll(/^ {2}'@types\/react@([^'(]+)':/gm)].map(
      match => match[1]
    );

    assert.equal(new Set(versions).size, 1, `versiones de @types/react: ${[...new Set(versions)].join(', ')}`);
  });
});
