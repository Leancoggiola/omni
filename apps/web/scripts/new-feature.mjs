#!/usr/bin/env node
/**
 * Scaffold a new web feature. Usage:
 *   pnpm web:new-feature gym --register-route --swr-domain gym
 *
 * El ítem de navegación no se genera acá: vive en `NAV_REGISTRY` de `@omni/shared/navigation`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(webRoot, 'src');
const featuresRoot = path.join(srcRoot, 'features');

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const positional = args.filter(a => !a.startsWith('--'));

const removedNavFlags = ['--register-nav', '--nav-key', '--no-nav'].filter(flag => flags.has(flag));
if (removedNavFlags.length > 0) {
  console.error(
    `${removedNavFlags.join(', ')} ya no existe: el ítem de navegación se registra en NAV_REGISTRY ` +
      '(packages/shared/src/navigation/registry.ts) y su ícono en NAV_ICONS de app/navigation/nav-registry.tsx.'
  );
  process.exit(1);
}

const name = positional[0];
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error(
    'Usage: pnpm web:new-feature <kebab-name> [--path /x] [--module main] [--register-route] [--swr-domain gym]'
  );
  process.exit(1);
}

const routePath = getFlagValue('--path') ?? `/${name}`;
if (!/^\/[a-z0-9][a-z0-9/-]*$/.test(routePath)) {
  console.error(
    `Invalid --path value: "${routePath}". Must look like /gym.\n` +
      'En Git Bash (MSYS) "/gym" se convierte en una ruta de Windows: usá MSYS_NO_PATHCONV=1 o corré el comando desde PowerShell.'
  );
  process.exit(1);
}
const moduleName = getFlagValue('--module') ?? 'main';
const swrDomain = getFlagValue('--swr-domain');
const registerRoute = flags.has('--register-route');

const featureDir = path.join(featuresRoot, name);
if (fs.existsSync(featureDir)) {
  console.error(`Feature already exists: ${featureDir}`);
  process.exit(1);
}

const pascal = name
  .split('-')
  .map(s => s.charAt(0).toUpperCase() + s.slice(1))
  .join('');
const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);

ensureDir(featureDir);
ensureDir(path.join(featureDir, 'modules', moduleName, 'components', `${pascal}Placeholder`));
ensureDir(path.join(featureDir, 'modules', moduleName, 'hooks'));

write(
  path.join(featureDir, 'modules', moduleName, 'components', `${pascal}Placeholder`, `${pascal}Placeholder.tsx`),
  `import { Text } from '@mantine/core';

import type { FC } from 'react';

export const ${pascal}Placeholder: FC = () => {
  return <Text c="dimmed">${pascal} — en construcción</Text>;
};
`
);
write(
  path.join(featureDir, 'modules', moduleName, 'components', `${pascal}Placeholder`, 'index.ts'),
  `export { ${pascal}Placeholder } from './${pascal}Placeholder';\n`
);
write(
  path.join(featureDir, 'modules', moduleName, 'components', 'index.ts'),
  `export { ${pascal}Placeholder } from './${pascal}Placeholder';\n`
);
write(path.join(featureDir, 'modules', moduleName, 'hooks', 'index.ts'), '');
write(
  path.join(featureDir, 'modules', moduleName, 'index.ts'),
  `export { ${pascal}Placeholder } from './components';\n`
);
write(path.join(featureDir, 'modules', 'index.ts'), `export { ${pascal}Placeholder } from './${moduleName}';\n`);

write(
  path.join(featureDir, `${name}.page.tsx`),
  `import { ${pascal}Placeholder } from './modules/${moduleName}';

import type { FC } from 'react';

export const ${pascal}Page: FC = () => {
  return <${pascal}Placeholder />;
};
`
);

write(
  path.join(featureDir, `${name}.routes.tsx`),
  `import { RouteObject } from 'react-router-dom';

import { ${pascal}Page } from './${name}.page';

export const ${camel}Route: RouteObject = {
  path: '${routePath}',
  element: <${pascal}Page />,
};
`
);

write(path.join(featureDir, 'index.ts'), `export { ${camel}Route } from './${name}.routes';\n`);

if (registerRoute) {
  appendRoute(name, camel);
}
if (swrDomain) {
  appendSwrStub(swrDomain);
}

console.log(`\nCreated feature: src/features/${name}/`);
console.log('\nNext steps:');
if (!swrDomain) console.log('  1. Add SWR keys in shared/api/keys.ts if needed');
console.log('  2. Nav: key en NAV_REGISTRY y MAIN_NAV_ORDER de packages/shared/src/navigation/registry.ts');
console.log('     ("web" en availableOn) e ícono en NAV_ICONS de app/navigation/nav-registry.tsx y de mobile');
if (!registerRoute) console.log('  3. Register route in app/routes.ts');
console.log('  4. pnpm --filter web check-types && pnpm --filter web test && pnpm --filter web check-api-paths');

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getFlagValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

/** Inserta el import de la feature en orden alfabético entre los `@/features/*` (lo que exige simple-import-sort). */
function insertFeatureImport(content, name, importLine) {
  if (content.includes(importLine)) return content;

  const featureImports = [...content.matchAll(/^import \{[^}]*\} from '@\/features\/([a-z0-9-]+)';$/gm)];
  const next = featureImports.find(match => match[1] > name);
  if (next) {
    return content.slice(0, next.index) + `${importLine}\n` + content.slice(next.index);
  }

  const last = featureImports.at(-1);
  if (!last) {
    console.error('No se encontraron imports de @/features/* donde insertar la feature: registrala a mano.');
    process.exit(1);
  }
  const end = last.index + last[0].length;
  return `${content.slice(0, end)}\n${importLine}${content.slice(end)}`;
}

function appendRoute(name, camel) {
  const routesFile = path.join(srcRoot, 'app', 'routes.ts');
  let content = fs.readFileSync(routesFile, 'utf8');
  const importLine = `import { ${camel}Route } from '@/features/${name}';`;
  content = insertFeatureImport(content, name, importLine);
  const routeRef = `${camel}Route`;
  const escapedRouteRef = escapeRegExp(routeRef);
  if (
    !content.includes(`protectedRoutes = [${routeRef}`) &&
    !content.match(new RegExp(`protectedRoutes = \\[[^\\]]*${escapedRouteRef}`))
  ) {
    content = content.replace(/export const protectedRoutes = (\[[^\]]+\])/, (_, arr) => {
      const inner = arr.slice(1, -1).trim();
      return `export const protectedRoutes = [${inner}, ${routeRef}]`;
    });
  }
  fs.writeFileSync(routesFile, content, 'utf8');
  console.log('Updated app/routes.ts');
}

function appendSwrStub(domain) {
  const keysFile = path.join(srcRoot, 'shared', 'api', 'keys.ts');
  let content = fs.readFileSync(keysFile, 'utf8');
  const stub = `  ${domain}: {\n    // list: '/api/${domain}/list',\n  },`;

  if (content.includes(`${domain}:`)) {
    console.log(`SWR_KEYS already contains domain: ${domain}`);
    return;
  }

  content = content.replace(/\n} as const;/, `\n${stub}\n} as const;`);
  fs.writeFileSync(keysFile, content, 'utf8');
  console.log(`Added SWR_KEYS stub for domain: ${domain}`);
}
