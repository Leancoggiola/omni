#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webSrc = path.join(repoRoot, 'apps', 'web', 'src');
const mobileSrc = path.join(repoRoot, 'apps', 'mobile', 'src');

const KNOWN_FLAGS = new Set(['--web', '--mobile', '--path', '--register-route']);
const USAGE =
  'Uso: pnpm new-feature <kebab-name> [--web] [--mobile] [--path /x] [--register-route]\n' +
  'Sin --web ni --mobile genera los dos clientes. --path y --register-route son solo de web.';

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--path');

const unknownFlags = [...flags].filter(flag => !KNOWN_FLAGS.has(flag));
if (unknownFlags.length > 0) {
  console.error(`Flag desconocido: ${unknownFlags.join(', ')}.\n${USAGE}`);
  process.exit(1);
}

const pathValue = getFlagValue('--path');
if (flags.has('--path') && (!pathValue || pathValue.startsWith('--'))) {
  console.error(`--path necesita un valor, como /gym.\n${USAGE}`);
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

const routePath = pathValue ?? `/${name}`;
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

const routesFile = path.join(webSrc, 'app', 'routes.ts');
const routesContent = targetWeb && registerRoute ? await formatRoutes(buildRoutesContent()) : null;

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
    `import { Stack } from '@mantine/core';

import { EmptyState, PageHeader } from '@/shared/ui';

import type { FC } from 'react';

import { ClockCountdownIcon } from '@phosphor-icons/react';

/** Página de ${pascal}, todavía en construcción. */
export const ${pascal}Page: FC = () => {
  return (
    <Stack gap="xl">
      <PageHeader icon={<ClockCountdownIcon size="1.5rem" />} title="${pascal}" subtitle="En construcción" />
      <EmptyState icon={<ClockCountdownIcon size="1.5rem" />} title="Próximamente" />
    </Stack>
  );
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
  if (routesContent) {
    fs.writeFileSync(routesFile, routesContent, 'utf8');
    console.log('Actualizado apps/web/src/app/routes.ts');
  }

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

/** Formatea el `routes.ts` nuevo con la config de Prettier del repo, para que no exceda el `printWidth`. */
async function formatRoutes(content) {
  const options = await prettier.resolveConfig(routesFile);
  return prettier.format(content, { ...options, filepath: routesFile });
}

/**
 * Devuelve `apps/web/src/app/routes.ts` con el import y la ruta de la feature en `protectedRoutes`, sin escribir
 * nada. Corre antes de generar los archivos: si no encuentra dónde registrarla, sale sin haber creado la feature.
 */
function buildRoutesContent() {
  let content = fs.readFileSync(routesFile, 'utf8');
  content = insertFeatureImport(content, `import { ${camel}Route } from '@/features/${name}';`);
  const routeRef = `${camel}Route`;
  const protectedRoutes = /export const protectedRoutes = \[([\s\S]*?)\];/;
  const match = content.match(protectedRoutes);
  if (!match) {
    console.error('No se encontró protectedRoutes en apps/web/src/app/routes.ts: registrá la ruta a mano.');
    process.exit(1);
  }
  const inner = match[1].replace(/\s+/g, ' ').trim().replace(/,$/, '');
  if (new RegExp(`\\b${escapeRegExp(routeRef)}\\b`).test(inner)) return content;
  return content.replace(protectedRoutes, `export const protectedRoutes = [${inner}, ${routeRef}];`);
}

/** Genera `<Name>Screen.tsx` e `index.ts` en `apps/mobile/src/features/<name>/`. */
function scaffoldMobile() {
  write(
    path.join(mobileDir, `${pascal}Screen.tsx`),
    `import { ClockCountdownIcon } from 'phosphor-react-native';

import { EmptyState, Screen, ScreenHeader } from '@/shared/ui';

/** Pantalla de ${pascal}, todavía en construcción. */
export function ${pascal}Screen() {
  return (
    <Screen>
      <ScreenHeader icon={ClockCountdownIcon} title="${pascal}" subtitle="En construcción" />
      <EmptyState icon={ClockCountdownIcon} title="Próximamente" />
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
