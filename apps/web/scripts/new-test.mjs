#!/usr/bin/env node
/**
 * Scaffold a colocated unit test. Usage:
 *   pnpm web:new-test src/features/profile/modules/_shared/utils/profileForm/profileForm.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');

let targetArg = process.argv[2];
if (!targetArg) {
  console.error('Usage: pnpm web:new-test <path-to-source.ts>');
  process.exit(1);
}

const targetPath = path.isAbsolute(targetArg)
  ? targetArg
  : path.resolve(webRoot, targetArg.replace(/^apps\/web\//, ''));

if (!fs.existsSync(targetPath)) {
  console.error(`Source file not found: ${targetPath}`);
  process.exit(1);
}

const dir = path.dirname(targetPath);
const baseName = path.basename(targetPath, path.extname(targetPath));
const testDir = path.join(dir, '__tests__');
const testFile = path.join(testDir, `${baseName}.test.ts`);

if (fs.existsSync(testFile)) {
  console.error(`Test already exists: ${testFile}`);
  process.exit(1);
}

fs.mkdirSync(testDir, { recursive: true });

const importPath = `../${baseName}`;

fs.writeFileSync(
  testFile,
  `import { describe, expect, it } from 'vitest';

import { } from '${importPath}';

describe('${baseName}', () => {
  it('TODO: add test', () => {
    expect(true).toBe(true);
  });
});
`
);

console.log(`Created test: ${path.relative(webRoot, testFile)}`);
