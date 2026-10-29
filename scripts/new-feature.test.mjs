import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'new-feature.mjs');
const ROUTES = `import { homeRoute } from '@/features/home';
import { profileRoute } from '@/features/profile';

export const protectedRoutes = [homeRoute, profileRoute];
export const guestRoutes = [];
`;

let root;

/** Crea un repo mínimo en un directorio temporal, con el `routes.ts` de web que `--register-route` modifica. */
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'new-feature-'));
  fs.mkdirSync(path.join(root, 'apps/web/src/app'), { recursive: true });
  fs.mkdirSync(path.join(root, 'apps/mobile/src/features'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apps/web/src/app/routes.ts'), ROUTES);
  fs.writeFileSync(path.join(root, '.prettierrc'), JSON.stringify({ singleQuote: true }));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

/** Corre `scripts/new-feature.mjs` contra el repo temporal y devuelve su salida y código de salida. */
function run(...args) {
  const result = spawnSync('node', [script, ...args], {
    env: { ...process.env, OMNI_NEW_FEATURE_TEST_ROOT: root },
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** Lista los archivos de `dir` (relativos a él), ordenados. */
function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .sort();
}

describe('new-feature', () => {
  it('--web genera la página, las rutas y el barrel, y nada en mobile', () => {
    const { status } = run('gym', '--web');

    assert.equal(status, 0);
    assert.deepEqual(listFiles(path.join(root, 'apps/web/src/features/gym')), [
      'gym.page.tsx',
      'gym.routes.tsx',
      'index.ts',
    ]);
    assert.deepEqual(listFiles(path.join(root, 'apps/mobile/src/features')), []);
    const routes = fs.readFileSync(path.join(root, 'apps/web/src/features/gym/gym.routes.tsx'), 'utf8');
    assert.match(routes, /export const gymRoute: RouteObject/);
    assert.match(routes, /path: '\/gym'/);
    assert.equal(
      fs.readFileSync(path.join(root, 'apps/web/src/features/gym/index.ts'), 'utf8'),
      "export { gymRoute } from './gym.routes';\n"
    );
    assert.equal(fs.readFileSync(path.join(root, 'apps/web/src/app/routes.ts'), 'utf8'), ROUTES);
  });

  it('--mobile genera el Screen y el barrel, y nada en web', () => {
    const { status } = run('pantry-list', '--mobile');

    assert.equal(status, 0);
    assert.deepEqual(listFiles(path.join(root, 'apps/mobile/src/features/pantry-list')), [
      'PantryListScreen.tsx',
      'index.ts',
    ]);
    assert.deepEqual(listFiles(path.join(root, 'apps/web/src/features')), []);
    assert.equal(
      fs.readFileSync(path.join(root, 'apps/mobile/src/features/pantry-list/index.ts'), 'utf8'),
      "export { PantryListScreen } from './PantryListScreen';\n"
    );
  });

  it('sin --web ni --mobile genera los dos clientes', () => {
    const { status } = run('gym');

    assert.equal(status, 0);
    assert.equal(listFiles(path.join(root, 'apps/web/src/features/gym')).length, 3);
    assert.equal(listFiles(path.join(root, 'apps/mobile/src/features/gym')).length, 2);
  });

  it('--register-route suma el import y la ruta en orden alfabético a routes.ts', () => {
    const { status } = run('gym', '--web', '--register-route', '--path', '/gimnasio');

    assert.equal(status, 0);
    const routes = fs.readFileSync(path.join(root, 'apps/web/src/app/routes.ts'), 'utf8');
    assert.match(routes, /import \{ gymRoute \} from '@\/features\/gym';\nimport \{ homeRoute \}/);
    assert.match(routes, /protectedRoutes = \[homeRoute, profileRoute, gymRoute\]/);
    assert.match(
      fs.readFileSync(path.join(root, 'apps/web/src/features/gym/gym.routes.tsx'), 'utf8'),
      /path: '\/gimnasio'/
    );
  });

  it('rechaza un nombre inválido sin generar nada', () => {
    for (const name of ['Gym', 'gym_list', '1gym', 'gym/list']) {
      const { status, stderr } = run(name, '--web');

      assert.equal(status, 1, name);
      assert.match(stderr, /Uso: pnpm new-feature/);
    }
    assert.deepEqual(listFiles(path.join(root, 'apps/web/src/features')), []);
  });

  it('rechaza una feature que ya existe sin tocar la existente', () => {
    fs.mkdirSync(path.join(root, 'apps/web/src/features/gym'), { recursive: true });
    fs.writeFileSync(path.join(root, 'apps/web/src/features/gym/keep.ts'), 'export {};\n');

    const { status, stderr } = run('gym', '--web', '--mobile');

    assert.equal(status, 1);
    assert.match(stderr, /La feature ya existe: apps\/web\/src\/features\/gym/);
    assert.deepEqual(listFiles(path.join(root, 'apps/web/src/features/gym')), ['keep.ts']);
    assert.deepEqual(listFiles(path.join(root, 'apps/mobile/src/features')), []);
  });

  it('rechaza flags desconocidos y --register-route sin --web', () => {
    assert.match(run('gym', '--nope').stderr, /Flag desconocido: --nope/);
    assert.match(run('gym', '--mobile', '--register-route').stderr, /son solo de web/);
  });
});
