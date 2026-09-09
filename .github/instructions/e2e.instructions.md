---
description: 'Convenciones de apps/e2e (Playwright): page objects, fixture propio, usuario por worker, precondiciones por API y selectores accesibles.'
applyTo: 'apps/e2e/**'
---

# E2E — convenciones

Referencia completa: [docs/tooling/e2e.md](../../docs/tooling/e2e.md).

## Estructura

```
apps/e2e/
  tests/<feature>.spec.ts     # specs
  src/pages/<Feature>Page.ts  # page objects
  src/fixtures/test.ts        # fixture propio (usuario por worker)
  src/support/                # env, admin API, stub de TMDB, globalSetup
```

## Reglas

- Importar `test` y `expect` de `../src/fixtures/test`, nunca de `@playwright/test`.
- Los locators van en un page object, no sueltos en el spec.
- Precondiciones por API (`page.request`, que ya va autenticado); acciones por UI.
- Nada de esperas por tiempo: usar los auto-wait de `expect(locator)`.
- La suite **nunca** toca la base de datos: los usuarios se crean por `POST /api/admin/users`.

## Aislamiento

Cada worker tiene su usuario. Los tests del mismo archivo pueden compartirlo, así que:

- Usar nombres únicos por test y no assertear sobre cantidades totales.
- Si el test necesita estado limpio o cambia credenciales, usar el fixture `freshUser`.

## Selectores

Preferir `getByRole`. `getByLabel` es ambiguo con Mantine, que asocia la etiqueta al wrapper y al control.

Si un elemento no tiene nombre accesible, agregarle `aria-label` en `apps/web` en vez de usar selectores por clase CSS.

## Comandos

```bash
docker compose up -d db-e2e
pnpm --filter e2e test:e2e
pnpm --filter e2e test:e2e:ui   # para escribir o debuggear
```
