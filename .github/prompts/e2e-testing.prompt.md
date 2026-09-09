---
mode: agent
description: Montar la suite de testing E2E (Playwright) e integration de API (Vitest + Postgres efímero) en apps/e2e, y migrar los route tests mockeados.
---

Actuás como QA Automation Engineer senior. Tu tarea es montar la estrategia de testing de **Omni** en fases verificables.

## Contexto del proyecto

Monorepo pnpm + Turbo. Leé `AGENTS.md` antes de empezar.

| App           | Stack                                 |
| ------------- | ------------------------------------- |
| `apps/web`    | React 19 + Vite + Mantine 9.6 + SWR   |
| `apps/api`    | Express 5 + Prisma + PostgreSQL       |
| `apps/mobile` | Expo + Tamagui (**fuera de alcance**) |

## Estado actual (ya relevado — no volver a investigarlo)

| Nivel                | Estado                                                       |
| -------------------- | ------------------------------------------------------------ |
| Unit funciones puras | ✅ 47 tests web + 79 api                                     |
| Component / render   | ⚠️ 1 solo test (`Home.test.tsx`)                             |
| Integration API+DB   | ❌ Cero — los route tests hacen `vi.mock()` del service      |
| E2E                  | ❌ Cero — Playwright existe solo como MCP, no como framework |

**Problema raíz a resolver:** `apps/api/src/__tests__/routes/*.routes.test.ts` mockean el service completo, así que la lógica de negocio y las queries de Prisma tienen cobertura cero. Un bug real de Express 5 (el getter de `req.query` descartaba la coerción de Zod y rompía Prisma con `take: "50"`) llegó a producción **con los 79 tests en verde**. La suite nueva tiene que ser capaz de detectar esa clase de bug.

## Infraestructura existente a reutilizar

- `docker-compose.yml` — Postgres 17-alpine con healthcheck.
- `apps/api/prisma/seed.ts` — seed.
- `apps/api/src/test/` — `createTestApp.ts`, `constants.ts`, `fixtures/`, `setupAuthMocks.ts`, `setupEnv.ts`.
- `.github/workflows/ci.yml` — jobs paralelos (`lint`, `check-types`, `test`, `audit`, `format`, `build`) con caché de Turbo.
- `turbo.json` — tasks con `dependsOn: [transit, db:generate]`.

## Decisiones ya tomadas (respetar, no re-preguntar)

1. **Alcance**: E2E web + integration de API con DB real. Mobile queda afuera.
2. **Ubicación**: nuevo package `apps/e2e` dentro del monorepo (entra al pipeline de Turbo).
3. **Datos**: Postgres efímero. En CI con el bloque `services:` de GitHub Actions; en local con `docker-compose` usando base `omni_test` separada de `omni_dev`. Reset con `prisma migrate reset --force` por corrida y seed determinístico.
4. **Route tests**: se **reemplazan** los actuales (mockeados) por integration tests contra DB real. Los unit tests de schemas/utils se mantienen intactos.
5. **CI**: los E2E corren en PR hacia `develop`/`main` y en nightly, no en cada push. La integration de API entra al job de test normal.
6. **Herramientas**: Playwright (`@playwright/test`) para E2E web; Vitest para integration de API.

## Fases

Ejecutá en orden y verificá al final de cada una. No avances si algo queda en rojo.

### Fase 1 — Integration de API (mayor ROI, empezar acá)

- Levantar Postgres de test y cablear `DATABASE_URL` de test.
- Helper de reset + seed determinístico entre archivos de test.
- Migrar `split-expenses.routes.test.ts` como piloto: sacar el `vi.mock` del service y pegarle a la DB real.
- **Test de regresión obligatorio**: `GET /gatherings?page=1&limit=50` debe llegar a Prisma con `take` numérico. Ese test tiene que fallar si se revierte el fix de `validate.ts`.
- Migrar el resto: `gym`, `pantry`, `expenses`, `notifications`.

> Migrar archivo por archivo, no borrar en bloque: los route tests actuales sí verifican códigos de estado, forma del payload y protección con `authenticateJwt`. En ningún momento debe quedar menos cobertura que hoy.

### Fase 2 — Scaffolding de `apps/e2e`

- `package.json` con scripts `test:e2e`, `test:e2e:ui`, `test:e2e:debug`.
- `playwright.config.ts`: `webServer` que levante api + web, reporters (html + list), retries en CI, trace `on-first-retry`.
- Registrar la task en `turbo.json` y en el workspace.
- Auth vía `storageState` (login una vez, reusar sesión) — no loguear en cada test.
- Page Objects / fixtures por feature.

### Fase 3 — Flujos E2E críticos

Cubrir happy path + un error path por feature:

- **auth**: login OK, credenciales inválidas, refresh silencioso en 401, logout.
- **media**: buscar en TMDB, agregar a la lista, cambiar estado, eliminar, ver poster en lightbox.
- **split-expenses**: crear amigo (validar alias min 6/max 20 + patrón), crear juntada, agregar gasto, ver liquidación, marcar saldado, eliminar.
- **profile**: editar perfil, cambiar contraseña, preferencias.
- **Transversal**: que `LoadingState` / `EmptyState` / `ErrorState` se rendericen donde corresponde.

### Fase 4 — CI

- Job `e2e` separado, disparado en PR a `develop`/`main` + `schedule` nightly.
- `services: postgres` nativo de Actions.
- Subir artifacts: reporte HTML, traces y videos de los fallos.
- Cachear los browsers de Playwright.

### Fase 5 — Documentación

- `docs/tooling/e2e.md`: cómo correr local, cómo debuggear un fallo, cómo escribir un test nuevo.
- Actualizar `AGENTS.md` (sección Verificación) y `docs/README.md`.
- Si aparece un patrón nuevo reutilizable, dejarlo en `.github/instructions/` o en una skill.

## A definir en la primera sesión

**Aislamiento entre tests de integration**: transacción con rollback, truncate de tablas, o reset completo. Cada opción tiene un trade-off distinto entre velocidad y aislamiento, y depende de si van a correr en paralelo. Decidilo con el schema de Prisma a la vista y consultá antes de implementar.

## Reglas de trabajo

- **No asumas.** Si hay más de un enfoque válido o falta contexto, preguntá antes de implementar. Consultá una por una las decisiones que toquen criterio de producto.
- **Centralizá.** Un solo patrón para toda la suite: mismos helpers, misma forma de seedear, misma forma de autenticar. Nada de enfoques distintos por feature.
- **Evidencia antes de afirmar.** No declares que algo funciona sin haber corrido el comando y visto la salida.
- Seguí `.github/instructions/` y las skills de `.github/skills/`.
- Tests deterministas: nada de esperas fijas por tiempo; usar los auto-wait de Playwright.
- Cada test se limpia lo suyo; no debe depender del orden de ejecución.

## Dependencias a instalar

```bash
pnpm --filter e2e add -D @playwright/test
pnpm --filter e2e exec playwright install --with-deps chromium
```

## Verificación

```bash
pnpm --filter api test          # integration incluida
pnpm --filter e2e test:e2e      # suite E2E
pnpm turbo lint check-types
```

## Entregable de la primera sesión

Fase 1 andando, con el test de regresión de `req.query` fallando si se revierte el fix de `validate.ts`.
