#!/usr/bin/env node
/**
 * Genera el esqueleto de una feature en web y/o mobile. Uso:
 *   pnpm new-feature <name> [--web] [--mobile] [--path /x] [--register-route]
 * Sin `--web` ni `--mobile` genera los dos clientes. `--path` y `--register-route` son solo de web.
 * La estructura sigue la convención de `docs/architecture.md`: solo el punto de entrada e `index.ts`,
 * sin carpetas vacías ni `modules/`. El ítem de navegación vive en `NAV_REGISTRY` de `@omni/shared/navigation`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webSrc = path.join(repoRoot, 'apps', 'web', 'src');
const mobileSrc = path.join(repoRoot, 'apps', 'mobile', 'src');

const KNOWN_FLAGS = new Set(['--web', '--mobile', '--path', '--register-route']);
const USAGE = 'Uso: pnpm new-feature <kebab-name> [--web] [--mobile] [--path /x] [--register-route]';

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--path');

const unknownFlags = [...flags].filter(flag => !KNOWN_FLAGS.has(flag));
if (unknownFlags.length > 0) {
  console.error(`Flag desconocido: ${unknownFlags.join(', ')}.\n${USAGE}`);
  process.exit(1);
}

const name = positional[0];
if (!name || positional.length > 1 || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error(USAGE);
  process.exit(1);
}

const onlyOne = flags.has('--web') || flags.has('--mobile');
const targetWeb = !onlyOne || flags.has('--web');
const targetMobile = !onlyOne || flags.has('--mobile');

const routePath = getFlagValue('--path') ?? `/${name}`;
if (!/^\/[a-z0-9][a-z0-9/-]*$/.test(routePath)) {
  console.error(
    `--path inválido: "${routePath}". Tiene que ser como /gym.\n` +
      'En Git Bash (MSYS) "/gym" se convierte en una ruta de Windows: usá MSYS_NO_PATHCONV=1 o corré el comando desde PowerShell.'
  );
  process.exit(1);
}
const registerRoute = flags.has('--register-route');
if (!targetWeb && (registerRoute || flags.has('--path'))) {
  console.error('--path y --register-route son solo de web: sumá --web.');
  process.exit(1);
}

const pascal = name
  .split('-')
  .map(s => s.charAt(0).toUpperCase() + s.slice(1))
  .join('');
const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);

const webDir = path.join(webSrc, 'features', name);
const mobileDir = path.join(mobileSrc, 'features', name);
for (const dir of [targetWeb && webDir, targetMobile && mobileDir].filter(Boolean)) {
  if (fs.existsSync(dir)) {
    console.error(`La feature ya existe: ${path.relative(repoRoot, dir)}`);
    process.exit(1);
  }
}

if (targetWeb) scaffoldWeb();
if (targetMobile) scaffoldMobile();

function getFlagValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Genera `<name>.page.tsx`, `<name>.routes.tsx` e `index.ts` en `apps/web/src/features/<name>/`. */
function scaffoldWeb() {
  write(
    path.join(webDir, `${name}.page.tsx`),
    `import { Text } from '@mantine/core';

import type { FC } from 'react';

export const ${pascal}Page: FC = () => {
  return <Text c="dimmed">${pascal} — en construcción</Text>;
};
`
  );
  write(
    path.join(webDir, `${name}.routes.tsx`),
    `import { RouteObject } from 'react-router-dom';

import { ${pascal}Page } from './${name}.page';

export const ${camel}Route: RouteObject = {
  path: '${routePath}',
  element: <${pascal}Page />,
};
`
  );
  write(path.join(webDir, 'index.ts'), `export { ${camel}Route } from './${name}.routes';\n`);
  if (registerRoute) appendRoute();

  console.log(`\nWeb: apps/web/src/features/${name}/`);
  console.log('Pasos que faltan:');
  if (!registerRoute) console.log(`  - Ruta: ${camel}Route en protectedRoutes de apps/web/src/app/routes.ts`);
  console.log('  - Nav: key en NAV_REGISTRY y MAIN_NAV_ORDER de packages/shared/src/navigation/registry.ts');
  console.log('    ("web" en availableOn) e ícono en NAV_ICONS de apps/web/src/app/navigation/nav-registry.tsx');
  console.log('  - Endpoints en API_PATHS de packages/shared/src/api/paths.ts; hooks en hooks/ (skill swr-hooks)');
  console.log('  - pnpm --filter web check-types && pnpm --filter web lint && pnpm --filter web test');
}

/** Inserta el import de la feature en orden alfabético entre los `@/features/*` (lo que exige simple-import-sort). */
function insertFeatureImport(content, importLine) {
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

/** Registra la ruta de la feature en `protectedRoutes` de `apps/web/src/app/routes.ts`. */
function appendRoute() {
  const routesFile = path.join(webSrc, 'app', 'routes.ts');
  let content = fs.readFileSync(routesFile, 'utf8');
  content = insertFeatureImport(content, `import { ${camel}Route } from '@/features/${name}';`);
  const routeRef = `${camel}Route`;
  if (!content.match(new RegExp(`protectedRoutes = \\[[^\\]]*\\b${escapeRegExp(routeRef)}\\b`))) {
    content = content.replace(/export const protectedRoutes = (\[[^\]]+\])/, (_, arr) => {
      const inner = arr.slice(1, -1).trim();
      return `export const protectedRoutes = [${inner}, ${routeRef}]`;
    });
  }
  fs.writeFileSync(routesFile, content, 'utf8');
  console.log('Actualizado apps/web/src/app/routes.ts');
}

/** Genera `<Name>Screen.tsx` e `index.ts` en `apps/mobile/src/features/<name>/`. */
function scaffoldMobile() {
  write(
    path.join(mobileDir, `${pascal}Screen.tsx`),
    `import { ClockCountdownIcon } from 'phosphor-react-native';

import { Screen, ScreenHeader } from '@/shared/ui';

/** Pantalla de ${pascal}, todavía en construcción. */
export function ${pascal}Screen() {
  return (
    <Screen>
      <ScreenHeader icon={ClockCountdownIcon} title="${pascal}" subtitle="En construcción" />
    </Screen>
  );
}
`
  );
  write(path.join(mobileDir, 'index.ts'), `export { ${pascal}Screen } from './${pascal}Screen';\n`);

  console.log(`\nMobile: apps/mobile/src/features/${name}/`);
  console.log('Pasos que faltan:');
  console.log(`  - Ruta en apps/mobile/app/ (tab en (tabs)/ o de stack) que solo importe @/features/${name}`);
  console.log(`  - "mobile" en availableOn de la key en packages/shared/src/navigation/registry.ts`);
  console.log(
    '  - Ruta en NAV_HREFS (navHrefs.ts) e ícono en NAV_ICONS (navIcons.ts) de apps/mobile/src/shared/navigation/'
  );
  console.log('  - pnpm --filter mobile check-types && pnpm --filter mobile lint && pnpm --filter mobile test');
}
