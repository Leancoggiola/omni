#!/usr/bin/env node
/**
 * Fail if /api/ string literals appear in apps/web/src. The endpoint map lives in @omni/shared/api (API_PATHS,
 * packages/shared/src/api/paths.ts, outside this scan) and shared/api/keys.ts re-exports it as SWR_KEYS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../src');
const keysFile = path.join(srcRoot, 'shared/api/keys.ts');
const apiPattern = /\/api\//;

const violations = [];

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
    if (entry.name === '__tests__') continue;
    if (path.normalize(fullPath) === path.normalize(keysFile)) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (apiPattern.test(line)) {
        violations.push(`${path.relative(srcRoot, fullPath)}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

walk(srcRoot);

if (violations.length > 0) {
  console.error('Found /api/ literals outside shared/api/keys.ts:\n');
  violations.forEach(v => console.error(`  ${v}`));
  console.error('\nUse SWR_KEYS from @/shared/api (API_PATHS of @omni/shared/api) instead.');
  process.exit(1);
}

console.log('check-api-paths: OK');
