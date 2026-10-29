#!/usr/bin/env node
/**
 * Falla si un cliente rompe la convención de estructura de features de `docs/architecture.md`. Uso:
 * `node scripts/check-structure.mjs <web|mobile>`. Reglas (los tests, `__tests__/` y `*.test.*`, no cuentan
 * como archivos auxiliares ni como hooks):
 * - `index.ts` solo en las fronteras: `features/<name>/`, `core/<area>/`, `shared/<area>/`, `layouts/` y
 *   `__tests__/helpers/`.
 * - Sin `modules/_shared`, y `modules/` solo con dos o más módulos.
 * - Una carpeta de componente (hija directa de `components/`) tiene al menos dos archivos.
 * - Los `use*.ts` / `use*.tsx` de `features/` viven en `hooks/` (los hooks de `core/`, `shared/` y `theme/` no son de features).
 * - Mobile no tiene `hooks.ts`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APPS = ['web', 'mobile'];
const SCAN_DIRS = { web: ['src'], mobile: ['src', 'app'] };
const BARREL_DEPTHS = [/^features\/[^/]+$/, /^(core|shared)\/[^/]+$/, /^layouts$/, /^__tests__\/helpers$/];

const isTestName = name => /\.(test|spec)\./.test(name);

/**
 * Devuelve las violaciones de estructura de `app` bajo `appRoot`, como `{ file, rule }` con `file` relativo a
 * `appRoot` y `rule` con la regla rota.
 */
export function checkStructure(app, appRoot) {
  const violations = [];
  const report = (fullPath, rule) => violations.push({ file: path.relative(appRoot, fullPath), rule });

  /** Recorre `dir` aplicando cada regla a sus archivos y carpetas; los barrels solo se miran bajo `srcRoot`. */
  function walk(dir, srcRoot) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    if (path.basename(dir) === 'modules') checkModules(dir, entries);
    if (path.basename(path.dirname(dir)) === 'components' && path.basename(dir) !== '__tests__') {
      checkComponentFolder(dir, entries);
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(fullPath, srcRoot);
        continue;
      }
      checkFile(fullPath, dir, srcRoot);
    }
  }

  /** `modules/` sin `_shared` y con al menos dos módulos. */
  function checkModules(dir, entries) {
    const modules = entries.filter(entry => entry.isDirectory() && entry.name !== '__tests__');
    if (modules.some(entry => entry.name === '_shared')) {
      report(
        path.join(dir, '_shared'),
        'modules/_shared no existe: lo compartido va en components/, hooks/ o utils/ de la raíz del feature'
      );
    }
    if (modules.length < 2) {
      report(dir, 'modules/ solo existe con dos o más módulos: con uno solo va plano en la raíz del feature');
    }
  }

  /** Una carpeta de componente tiene el componente más al menos un auxiliar (archivo o subcarpeta). */
  function checkComponentFolder(dir, entries) {
    const files = entries.filter(entry =>
      entry.isFile() ? !isTestName(entry.name) : entry.isDirectory() && entry.name !== '__tests__'
    );
    if (files.length < 2) {
      report(
        dir,
        'una carpeta de componente necesita auxiliares (subcomponentes, .module.scss): con un solo archivo va plano en components/'
      );
    }
  }

  /** Barrels fuera de las fronteras, `use*` de features fuera de `hooks/` y `hooks.ts` en mobile. */
  function checkFile(fullPath, dir, srcRoot) {
    const name = path.basename(fullPath);
    if (/^index\.tsx?$/.test(name) && fullPath.startsWith(srcRoot + path.sep)) {
      const rel = path.relative(srcRoot, dir).split(path.sep).join('/');
      if (!BARREL_DEPTHS.some(pattern => pattern.test(rel))) {
        report(
          fullPath,
          'index.ts solo en features/<name>/, core/<area>/, shared/<area>/, layouts/ y __tests__/helpers/'
        );
      }
    }
    const inFeatures = path.relative(srcRoot, fullPath).split(path.sep)[0] === 'features';
    if (
      inFeatures &&
      /^use[A-Z].*\.tsx?$/.test(name) &&
      !isTestName(name) &&
      path.basename(dir) !== '__tests__' &&
      path.basename(dir) !== 'hooks'
    ) {
      report(fullPath, 'los hooks de una feature (use*.ts) viven en hooks/');
    }
    if (app === 'mobile' && /^hooks\.tsx?$/.test(name)) {
      report(fullPath, 'mobile no usa hooks.ts: un hook por archivo en hooks/useX.ts');
    }
  }

  for (const scanDir of SCAN_DIRS[app]) {
    const root = path.join(appRoot, scanDir);
    if (fs.existsSync(root)) walk(root, path.join(appRoot, 'src'));
  }
  return violations;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = process.argv[2];
  if (!APPS.includes(app)) {
    console.error(`Uso: check-structure.mjs <${APPS.join('|')}>`);
    process.exit(2);
  }

  const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps', app);
  const violations = checkStructure(app, appRoot);

  if (violations.length > 0) {
    console.error(`Estructura fuera de la convención en apps/${app} (ver docs/architecture.md):\n`);
    violations.forEach(({ file, rule }) => console.error(`  ${file}: ${rule}`));
    process.exit(1);
  }

  console.log(`check-structure (${app}): OK`);
}
