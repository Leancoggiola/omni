#!/usr/bin/env node
/**
 * Falla si hay literales `/api/` en el código de un cliente. Uso: `node scripts/check-api-paths.mjs <web|mobile>`.
 * El mapa de endpoints vive en `@omni/shared/api` (API_PATHS, packages/shared/src/api/paths.ts, fuera de este
 * escaneo) y `shared/api/keys.ts` de cada cliente lo reexporta (SWR_KEYS en web, API_KEYS en mobile).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APPS = { web: 'SWR_KEYS', mobile: 'API_KEYS' };
const SCAN_DIRS = { web: ['src'], mobile: ['src', 'app'] };

const app = process.argv[2];
if (!APPS[app]) {
  console.error(`Uso: check-api-paths.mjs <${Object.keys(APPS).join('|')}>`);
  process.exit(2);
}

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps', app);
const keysFile = path.join(appRoot, 'src/shared/api/keys.ts');
const apiPattern = /\/api\//;

const violations = [];

/** Recorre `dir` y registra cada línea con `/api/` en archivos de producción (sin tests ni `keys.ts`). */
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      walk(fullPath);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;
    if (path.normalize(fullPath) === path.normalize(keysFile)) continue;

    fs.readFileSync(fullPath, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (apiPattern.test(line)) {
          violations.push(`${path.relative(appRoot, fullPath)}:${index + 1}: ${line.trim()}`);
        }
      });
  }
}

SCAN_DIRS[app].forEach(dir => walk(path.join(appRoot, dir)));

if (violations.length > 0) {
  console.error(`Found /api/ literals outside shared/api/keys.ts in apps/${app}:\n`);
  violations.forEach(v => console.error(`  ${v}`));
  console.error(`\nUse ${APPS[app]} from @/shared/api (API_PATHS of @omni/shared/api) instead.`);
  process.exit(1);
}

console.log(`check-api-paths (${app}): OK`);
