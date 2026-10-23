#!/usr/bin/env node
/**
 * Scaffold a feature hook. Usage:
 *   pnpm web:new-hook media library useMyMediaList
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../src');

const [feature, module, hookName] = process.argv.slice(2);
if (!feature || !module || !hookName || !/^use[A-Z]/.test(hookName)) {
  console.error('Usage: pnpm web:new-hook <feature> <module> <useName>');
  console.error('Example: pnpm web:new-hook media library useMyMediaList');
  process.exit(1);
}

const hookDir = path.join(srcRoot, 'features', feature, 'modules', module, 'hooks', hookName);
if (fs.existsSync(hookDir)) {
  console.error(`Hook already exists: ${hookDir}`);
  process.exit(1);
}

const hooksIndex = path.join(srcRoot, 'features', feature, 'modules', module, 'hooks', 'index.ts');

fs.mkdirSync(hookDir, { recursive: true });

fs.writeFileSync(
  path.join(hookDir, `${hookName}.ts`),
  `import useSWR from 'swr';

import { SWR_KEYS } from '@/shared/api';

export function ${hookName}() {
  return useSWR(SWR_KEYS.${feature}.list);
}
`
);

fs.writeFileSync(path.join(hookDir, 'index.ts'), `export { ${hookName} } from './${hookName}';\n`);

let hooksBarrel = fs.existsSync(hooksIndex) ? fs.readFileSync(hooksIndex, 'utf8') : '';
const exportLine = `export { ${hookName} } from './${hookName}';`;
if (!hooksBarrel.includes(exportLine)) {
  hooksBarrel += `${hooksBarrel.endsWith('\n') || hooksBarrel === '' ? '' : '\n'}${exportLine}\n`;
  fs.mkdirSync(path.dirname(hooksIndex), { recursive: true });
  fs.writeFileSync(hooksIndex, hooksBarrel, 'utf8');
}

console.log(`Created hook: features/${feature}/modules/${module}/hooks/${hookName}/`);
console.log('Next: update SWR_KEYS and hook implementation.');
