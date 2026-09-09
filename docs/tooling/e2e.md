# E2E con Playwright

Suite end-to-end de **apps/web** contra la API y una base de datos reales. Vive en `apps/e2e`.

> No confundir con [playwright.md](./playwright.md), que documenta el **MCP** de Playwright que usan los agentes para inspeccionar la app a mano. Son cosas distintas.

## Qué cubre cada nivel

| Nivel              | Dónde                                 | Qué valida                                            |
| ------------------ | ------------------------------------- | ----------------------------------------------------- |
| Unit               | `apps/*/src/**/*.test.ts`             | Schemas, utilidades puras                             |
| Integración de API | `apps/api/src/__tests__/integration/` | Routing, auth, reglas de negocio, SQL emitido         |
| **E2E**            | `apps/e2e/tests/`                     | Que el usuario pueda completar el flujo en el browser |

Si algo se puede probar en un nivel más barato, va en ese nivel. E2E cubre el happy path y un error path por feature.

---

## Correr la suite

```bash
docker compose up -d db-e2e     # postgres:17-alpine, puerto 5434, tmpfs (efímero)
pnpm --filter e2e test:e2e
```

No hace falta levantar nada más: Playwright arranca la API, la web y el stub de TMDB, y resetea la base antes de cada corrida.

| Script            | Para qué                           |
| ----------------- | ---------------------------------- |
| `test:e2e`        | Corrida completa, headless         |
| `test:e2e:ui`     | Modo UI, ideal para escribir tests |
| `test:e2e:debug`  | Paso a paso con el inspector       |
| `test:e2e:report` | Abre el último reporte HTML        |

Para un solo archivo o un solo test:

```bash
pnpm --filter e2e exec playwright test media.spec.ts
pnpm --filter e2e exec playwright test -g "abre el poster"
```

---

## Cómo está armado

`playwright.config.ts` levanta tres `webServer`:

| Servidor  | Comando                         | Puerto | Por qué                                                                    |
| --------- | ------------------------------- | ------ | -------------------------------------------------------------------------- |
| Stub TMDB | `node src/support/tmdbStub.mjs` | 3199   | La API llama a TMDB **desde el servidor**, así que `page.route` no alcanza |
| API       | `pnpm --filter api dev:e2e`     | 3000   | Carga `apps/api/.env.e2e`. El puerto es fijo: el proxy de Vite apunta ahí  |
| Web       | `pnpm --filter web dev`         | 5173   | El proxy `/api` hace que todo sea mismo-origen y las cookies funcionen     |

`reuseExistingServer` está en `false` a propósito: reusar una API de desarrollo haría que la suite escriba sobre la base de dev sin avisar.

`globalSetup` corre `pnpm --filter api db:e2e:reset`, que aplica migraciones y siembra el admin. Es el **único** punto en el que la suite toca la base: los tests solo hablan HTTP.

---

## Aislamiento entre tests

Cada worker de Playwright crea **su propio usuario** vía `POST /api/admin/users` y guarda su sesión en `storageState`. Por eso la suite puede correr en paralelo sin que un test pise los datos de otro.

Consecuencias al escribir tests:

- Los tests del mismo archivo pueden caer en el mismo worker y **compartir usuario**. Usá nombres únicos por test y no assertees sobre cantidades totales ni sobre "la lista está vacía".
- Si tu test necesita estado limpio, o cambia las credenciales, pedí un usuario propio:

```ts
test('...', async ({ page, freshUser }) => {
  const user = await freshUser('etiqueta');
  // el contexto ya quedó logueado con ese usuario
});
```

Sin `freshUser`, un test que cambia la contraseña rompería al resto de los archivos que corren en ese worker.

---

## Escribir un test nuevo

1. **Page object** en `src/pages/`, con los locators como métodos:

```ts
export class MediaPage {
  constructor(private readonly page: Page) {}
  readonly saveButton = () => this.page.getByRole('button', { name: 'Guardar' });
}
```

2. **Spec** en `tests/`, importando el fixture propio (no `@playwright/test` directo):

```ts
import { expect, test } from '../src/fixtures/test';
```

3. **Precondiciones por API, acciones por UI.** Montar el escenario clickeando es lento y frágil:

```ts
await page.request.post('/api/media/list', { data: { tmdbId: 603, mediaType: 'movie' } });
await page.reload();
```

`page.request` comparte las cookies del browser, así que ya va autenticado.

4. Nada de esperas por tiempo. Usar los auto-wait de `expect(locator)`.

---

## Selectores: trampas conocidas

Preferir `getByRole` siempre. Estas son las que ya nos mordieron:

| Síntoma                                                | Causa y solución                                                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `getByLabel('Estado')` matchea 2 elementos             | Mantine asocia la etiqueta al wrapper y al control. Usar `getByRole('combobox', { name })`                       |
| El botón de eliminar de una card "no existe"           | `MediaCard` solo lo renderiza con `useHover`. Hacer `hover()` antes                                              |
| El `Switch` no es clickeable                           | Su input está oculto visualmente. `click({ force: true })`                                                       |
| El título de la juntada no es un heading               | Se renderiza como `<p>`. Usar `getByText`                                                                        |
| `getByText(titulo)` matchea 2 veces tras usar el modal | Las opciones del dropdown siguen montadas. Esperar `getByRole('dialog')` oculto                                  |
| Un monto aparece más de una vez                        | "Parte equitativa" repite el importe. Acotar al bloque, ej. `getByText('¿Quién le debe a quién?').locator('..')` |

Si un elemento no tiene nombre accesible, **agregarle `aria-label` en `apps/web`** en vez de recurrir a selectores por clase. Es una mejora real de accesibilidad y de paso hace el test estable. Ya se hizo con el botón de logout, los de media y el `LoadingState`.

Formato de moneda (`MoneyAmount`, es-AR): `$13.124,00`.

---

## Debuggear un fallo

**En local**, lo más rápido es el modo UI, que deja repetir el test y ver el DOM en cada paso:

```bash
pnpm --filter e2e test:e2e:ui
```

Ante un fallo, Playwright deja en `apps/e2e/test-results/<test>/`:

- `test-failed-1.png` — screenshot del momento exacto
- `error-context.md` — **snapshot de accesibilidad de la página**, que suele decir por qué el locator no matcheó
- `trace.zip` — solo en reintentos

```bash
pnpm --filter e2e exec playwright show-trace apps/e2e/test-results/<test>/trace.zip
```

**En CI**, todo eso se sube como artifact `playwright-report` en el job `E2E`.

Si falla la app entera y no un locator, mirá los `[WebServer]` de la salida: ahí aparecen los errores de consola del browser y los de la API.

---

## CI

El job `E2E` de `.github/workflows/ci.yml` corre en **PR hacia `develop`/`main`** y en el **nightly** (`schedule`), no en cada push: levantar api + web es lento.

Está en `continue-on-error: true` hasta comprobar que la suite es estable; después hay que volverlo bloqueante.

Usa `services: postgres` en el puerto 5434 y cachea los browsers según la versión de `@playwright/test`.

---

## Entorno

`apps/api/.env.e2e` está commiteado a propósito: no tiene secretos reales y así la suite corre sin setup previo.

| Variable                  | Por qué                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `TMDB_BASE_URL`           | Apunta al stub local en vez de a TMDB                                                                |
| `RATE_LIMIT_DISABLED`     | Los límites son por IP y toda la suite sale de una sola; `authLimiter` permite 10 logins cada 15 min |
| `ADMIN_USERNAME/PASSWORD` | Los usa el seed. Deben coincidir con `ADMIN` de `src/support/env.ts`                                 |

El reset aborta si la URL no es local o si la base no termina en `_test` o `_e2e`.
