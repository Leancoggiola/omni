#!/usr/bin/env node
/**
 * Scaffold a feature component. Usage:
 *   pnpm web:new-component profile settings ProfileCard
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../src');

const [feature, module, componentName] = process.argv.slice(2);
if (!feature || !module || !componentName || !/^[A-Z]/.test(componentName)) {
  console.error('Usage: pnpm web:new-component <feature> <module> <ComponentName>');
  console.error('Example: pnpm web:new-component profile settings ProfileCard');
  process.exit(1);
}

const componentDir = path.join(srcRoot, 'features', feature, 'modules', module, 'components', componentName);

if (fs.existsSync(componentDir)) {
  console.error(`Component already exists: ${componentDir}`);
  process.exit(1);
}

const componentsIndex = path.join(srcRoot, 'features', feature, 'modules', module, 'components', 'index.ts');

fs.mkdirSync(componentDir, { recursive: true });

fs.writeFileSync(
  path.join(componentDir, `${componentName}.tsx`),
  `import type { FC } from 'react';

interface ${componentName}Props {}

export const ${componentName}: FC<${componentName}Props> = () => {
  return null;
};
`
);

fs.writeFileSync(path.join(componentDir, 'index.ts'), `export { ${componentName} } from './${componentName}';\n`);

let componentsBarrel = fs.existsSync(componentsIndex) ? fs.readFileSync(componentsIndex, 'utf8') : '';
const exportLine = `export { ${componentName} } from './${componentName}';`;
if (!componentsBarrel.includes(exportLine)) {
  componentsBarrel += `${componentsBarrel.endsWith('\n') || componentsBarrel === '' ? '' : '\n'}${exportLine}\n`;
  fs.mkdirSync(path.dirname(componentsIndex), { recursive: true });
  fs.writeFileSync(componentsIndex, componentsBarrel, 'utf8');
}

console.log(`Created component: features/${feature}/modules/${module}/components/${componentName}/`);
