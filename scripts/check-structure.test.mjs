import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkStructure } from './check-structure.mjs';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'check-structure.mjs');

let root;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-structure-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

/** Crea cada archivo de `files` (rutas relativas a la raíz temporal) con contenido vacío. */
function make(...files) {
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), 'export {};\n');
  }
}

/** Devuelve las violaciones como `archivo` → `regla`, ordenadas por archivo. */
function check(app) {
  return checkStructure(app, root).sort((a, b) => a.file.localeCompare(b.file));
}

describe('check-structure', () => {
  it('acepta una feature que sigue la convención', () => {
    make(
      'src/features/media/index.ts',
      'src/features/media/media.page.tsx',
      'src/features/media/components/Card.tsx',
      'src/features/media/components/Modal/Modal.tsx',
      'src/features/media/components/Modal/ModalForm.tsx',
      'src/features/media/components/Modal/Modal.test.tsx',
      'src/features/media/hooks/useMedia.ts',
      'src/features/media/__tests__/useMedia.test.ts',
      'src/features/media/modules/a/a.page.tsx',
      'src/features/media/modules/b/b.page.tsx',
      'src/core/auth/index.ts',
      'src/shared/ui/index.ts',
      'src/layouts/index.ts',
      'src/__tests__/helpers/index.ts',
      'src/shared/ui/useReduce.ts'
    );

    assert.deepEqual(check('web'), []);
  });

  it('rechaza un index.ts fuera de las fronteras', () => {
    make(
      'src/features/media/components/index.ts',
      'src/features/media/hooks/index.ts',
      'src/features/media/utils/index.ts',
      'src/features/media/modules/friends/index.ts',
      'src/shared/ui/confirm/index.ts',
      'src/index.ts',
      'src/core/index.ts'
    );

    const files = check('web').map(v => v.file);

    assert.deepEqual(files.filter(f => !f.includes('modules')).sort(), [
      'src/core/index.ts',
      'src/features/media/components/index.ts',
      'src/features/media/hooks/index.ts',
      'src/features/media/utils/index.ts',
      'src/index.ts',
      'src/shared/ui/confirm/index.ts',
    ]);
    assert.ok(files.includes('src/features/media/modules/friends/index.ts'));
    assert.match(check('web')[0].rule, /index\.ts solo en features/);
  });

  it('rechaza modules/_shared', () => {
    make(
      'src/features/x/modules/_shared/a.ts',
      'src/features/x/modules/a/a.page.tsx',
      'src/features/x/modules/b/b.page.tsx'
    );

    assert.deepEqual(check('web'), [
      {
        file: 'src/features/x/modules/_shared',
        rule: 'modules/_shared no existe: lo compartido va en components/, hooks/ o utils/ de la raíz del feature',
      },
    ]);
  });

  it('rechaza un modules/ con un solo módulo', () => {
    make('src/features/x/modules/a/a.page.tsx');

    assert.deepEqual(
      check('web').map(v => v.file),
      ['src/features/x/modules']
    );
    assert.match(check('web')[0].rule, /dos o más módulos/);
  });

  it('rechaza una carpeta de componente con un solo archivo, aunque tenga tests', () => {
    make(
      'src/features/x/components/Solo/Solo.tsx',
      'src/features/x/components/Solo/Solo.test.tsx',
      'src/features/x/components/Par/Par.tsx',
      'src/features/x/components/Par/ParPart.tsx',
      'src/layouts/components/__tests__/Navbar.test.tsx'
    );

    assert.deepEqual(
      check('web').map(v => v.file),
      ['src/features/x/components/Solo']
    );
    assert.match(check('web')[0].rule, /carpeta de componente necesita auxiliares/);
  });

  it('cuenta una subcarpeta como auxiliar de una carpeta de componente', () => {
    make('src/features/x/components/Card/Card.tsx', 'src/features/x/components/Card/parts/Row.tsx');

    assert.deepEqual(check('web'), []);
  });

  it('rechaza un use*.ts de una feature fuera de hooks/, pero no sus tests', () => {
    make(
      'src/features/x/utils/useThing.ts',
      'src/features/x/components/useCard.tsx',
      'src/features/x/utils/useThing.test.ts',
      'src/features/x/hooks/useOk.ts'
    );

    assert.deepEqual(
      check('web').map(v => v.file),
      ['src/features/x/components/useCard.tsx', 'src/features/x/utils/useThing.ts']
    );
    assert.match(check('web')[0].rule, /viven en hooks\//);
  });

  it('rechaza hooks.ts en mobile y lo acepta en web', () => {
    make('src/features/media/hooks.ts');

    assert.deepEqual(
      check('mobile').map(v => v.file),
      ['src/features/media/hooks.ts']
    );
    assert.match(check('mobile')[0].rule, /mobile no usa hooks\.ts/);
    assert.deepEqual(check('web'), []);
  });

  it('en mobile acepta los index.tsx de las rutas de app/', () => {
    make('app/(tabs)/index.tsx', 'app/login.tsx');

    assert.deepEqual(check('mobile'), []);
  });

  it('el CLI nombra el archivo y la regla y sale con 1', () => {
    const result = spawnSync('node', [script, 'desconocido'], { encoding: 'utf8' });

    assert.equal(result.status, 2);
    assert.match(result.stderr, /Uso: check-structure\.mjs <web\|mobile>/);
  });

  it('el CLI pasa sobre el árbol actual de los dos clientes', () => {
    for (const app of ['web', 'mobile']) {
      const result = spawnSync('node', [script, app], { encoding: 'utf8' });

      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, new RegExp(`check-structure \\(${app}\\): OK`));
    }
  });
});
