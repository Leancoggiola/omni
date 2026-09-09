# Web — Plantillas de prompt para agentes (Cursor)

Plantillas listas para copiar y pegar al implementar un feature en `apps/web`. Están alineadas con:

- [AGENTS.md](../../AGENTS.md) — índice y reglas de oro
- [architecture.md](../architecture.md) — mapa del monorepo
- [new-feature.md](./new-feature.md) — checklist operativo
- [tooling.md](./tooling.md) — scripts y testing
- Cursor rules: `web-structure`, `web-api-paths`, `web-swr-hooks`, `web-forms-feedback`, `web-style-props`
- Skills: `.github/skills/web-structure/`, `.github/skills/swr-hooks/`

**Antes de pegar un prompt:** reemplazá los placeholders `{{...}}`.

| Placeholder         | Ejemplo                            |
| ------------------- | ---------------------------------- |
| `{{featureKebab}}`  | `gym`, `expenses`, `pantry`        |
| `{{featurePascal}}` | `Gym`, `Expenses`, `Pantry`        |
| `{{routePath}}`     | `/gym`, `/expenses`                |
| `{{navKey}}`        | `gym` (clave en `MAIN_NAV_ORDER`)  |
| `{{module}}`        | `main`, `library`, `settings`      |
| `{{swrDomain}}`     | mismo que feature o subdominio API |

---

## Reglas que el agente debe respetar

Incluí al inicio de prompts largos:

```markdown
Seguí AGENTS.md y docs/architecture.md.
Para exploración transversal, usá CodeGraph MCP antes de leer muchos archivos.
Las rules web/\*\* aplican automáticamente. Feature: {{featureKebab}}.
Verificar: check-types, lint, check-api-paths, test (ver AGENTS.md).
```

---

## Prompt maestro — Feature completo (recomendado)

Usá este prompt para un dominio nuevo de punta a punta (scaffold + datos + UI mínima).

````markdown
Implementá el feature web **{{featureKebab}}** en `apps/web` siguiendo las convenciones del repo.

## Contexto obligatorio

(pegar bloque "Reglas que el agente debe respetar" de arriba)

## Alcance

- Ruta protegida: `{{routePath}}`
- Nav key: `{{navKey}}` (reemplazar placeholder en nav-registry si existe)
- Módulo inicial: `{{module}}`
- Dominio SWR en keys: `{{swrDomain}}`

## Paso 1 — Scaffold

Ejecutar desde la raíz del monorepo:

```bash
pnpm web:new-feature {{featureKebab}} --path {{routePath}} --module {{module}} --register-route --register-nav --nav-key {{navKey}} --swr-domain {{swrDomain}}
```
````

## Paso 2 — API contract (monorepo shared + api)

- Si el backend ya expone endpoints, documentá las rutas reales y agregá keys en `SWR_KEYS.{{swrDomain}}` (no inventar paths que no existan en `apps/api`).
- Si el backend aún no existe, dejá stubs comentados en `keys.ts` y un placeholder en la page; no implementar fetch a URLs ficticias activas.

## Paso 3 — Data layer

- Crear hook(s) con `pnpm web:new-hook {{featureKebab}} {{module}} use{{featurePascal}}List` (ajustar nombre).
- Patrón de referencia:
  - Lista con filtros → copiar `useMyMediaList` + `buildQueryString`
  - Mutaciones que invalidan lista → copiar `useMediaMutations` + `useSWRConfig` + `startsWith`
  - Perfil / PATCH parcial → copiar `useProfile` + utils `build*Updates`

## Paso 4 — UI

- Reemplazar `{{featurePascal}}Placeholder` por UI mínima funcional (Mantine 9, español, Phosphor icons).
- Page delgada: solo estado local de UI + hooks; sin `api.*` directo.

## Paso 5 — Nav

- Actualizar `{{featureKebab}}.nav.tsx`: label en español, icono Phosphor acorde, `disabled: false` cuando esté listo.
- Confirmar entrada en `app/navigation/nav-registry.tsx`.

## Paso 6 — Verificación

```bash
pnpm --filter web check-types
pnpm --filter web lint
pnpm --filter web check-api-paths
pnpm --filter web test:coverage
```

## Entregables

- Lista de archivos creados/modificados
- Keys SWR añadidas
- Comandos ejecutados y resultado
- Notas si quedó algo bloqueado por API inexistente

````

---

## Ejemplo listo — Gimnasio

```markdown
Implementá el feature web **gym** en `apps/web`.

## Contexto obligatorio
(pegar bloque de reglas)

## Alcance
- Ruta: `/gym`
- Nav key: `gym` (ya hay placeholder con BarbellIcon en nav-registry)
- Módulo: `main`
- SWR domain: `gym`

## Scaffold
```bash
pnpm web:new-feature gym --path /gym --module main --register-route --register-nav --nav-key gym --swr-domain gym
````

## UI objetivo (MVP)

- Page con título "Gimnasio" y mensaje de módulo en construcción **solo si no hay API**.
- Si existe `GET /api/gym/...` en apps/api, conectar listado real con hook + SWR.

## Referencia

- Estructura multi-módulo futura: `features/media`
- Nav: reutilizar icono `BarbellIcon` ya usado en placeholders

## Verificación

(check-types, lint, check-api-paths, test:coverage)

````

---

## Ejemplo listo — Gastos

```markdown
Implementá el feature web **expenses** en `apps/web`.

## Contexto obligatorio
(pegar bloque de reglas)

## Alcance
- Ruta: `/expenses`
- Nav key: `expenses`
- Módulo: `main`
- SWR domain: `expenses`

## Scaffold
```bash
pnpm web:new-feature expenses --path /expenses --module main --register-route --register-nav --nav-key expenses --swr-domain expenses
````

## UI objetivo (MVP)

- Page "Gastos" con layout Mantine coherente con `media.page.tsx` (Tabs si hay listado + formulario).
- Formularios de alta/edición: `Alert` errores, `notifySuccess` al guardar.

## Referencia

- Listas + mutations: `features/media`
- Forms + PATCH utils: `features/profile`

## Verificación

(check-types, lint, check-api-paths, test:coverage)

````

---

## Prompt corto — Solo hook SWR

```markdown
En `apps/web`, agregá el hook `use{{HookName}}` en:
`features/{{featureKebab}}/modules/{{module}}/hooks/use{{HookName}}/`

Requisitos:
- Keys solo desde `SWR_KEYS` + `buildQueryString` para query params
- Seguir `.github/skills/swr-hooks/SKILL.md` (useSWR vs useSWRImmutable vs useSWRMutation)
- Exportar en barrels `index.ts`
- No hardcodear `/api/`
- Patrón de referencia: `useMyMediaList` o `useMediaMutations` según read/write

Endpoint(s): {{descripción o rutas reales del API}}

Al final: `pnpm --filter web check-api-paths && pnpm --filter web check-types`
````

**Comando scaffold opcional:**

```bash
pnpm web:new-hook {{featureKebab}} {{module}} use{{HookName}}
```

---

## Prompt corto — Solo formulario

```markdown
En `apps/web/features/{{featureKebab}}/`, creá el formulario `{{ComponentName}}` para {{descripción}}.

Requisitos:

- `@mantine/form`; schema de `@omni/shared` si existe (`schemaResolver` o `safeParse`)
- PATCH parcial: extraer `build{{Domain}}Updates` a `modules/.../utils/` con tests (`pnpm web:new-test <path>`)
- Errores submit → `Alert color="destructive" variant="light"`
- Éxito → `notifySuccess` (mutation la hace el padre/hook)
- Español, Phosphor icons en inputs si aplica

Referencia: `ProfileSettingsForm` + `profileForm.ts`

Verificar: `pnpm --filter web test:coverage`
```

---

## Prompt corto — Solo endpoint / SWR key

```markdown
Agregá soporte web para el endpoint del API:

- Método: {{GET|POST|PATCH|DELETE}}
- Ruta backend: {{/api/...}}
- Uso en UI: {{read list / mutation / ambos}}

Tareas:

1. Añadir key(s) en `apps/web/src/shared/api/keys.ts` (helper si hay `:id`)
2. Usar desde hook existente o crear uno con `web:new-hook`
3. `pnpm --filter web check-api-paths`

No dejar literales `/api/` fuera de keys.ts.
```

---

## Prompt — Tests eficientes (utils / shared api)

```markdown
Agregá tests unitarios de alto ROI para `{{ruta/al/archivo.ts}}` en apps/web.

Reglas:

- Scope de coverage: `shared/api/keys.ts`, `fetcher.ts`, `**/utils/**/*.ts` (ver `vitest.config.ts`)
- No tests de render de componentes Mantine salvo smoke crítico
- Usar `pnpm web:new-test` para generar plantilla
- Objetivo: mantener ≥80% branches en el scope

Referencia: `profileForm.test.ts`, `keys.test.ts`, `fetcher.test.ts`

Ejecutar: `pnpm --filter web test:coverage`
```

---

## Checklist post-implementación (humano o agente)

```markdown
## Checklist {{featureKebab}}

- [ ] `pnpm web:new-feature` ejecutado (o estructura equivalente)
- [ ] Ruta en `app/routes.ts` → `protectedRoutes`
- [ ] Nav en `nav-registry.tsx` + `*.nav.tsx` (icono, label ES, disabled false si listo)
- [ ] `SWR_KEYS.{{swrDomain}}` con endpoints reales
- [ ] Hooks bajo `modules/<module>/hooks/useX/`
- [ ] Page sin `api.*` directo
- [ ] `pnpm --filter web check-api-paths` OK
- [ ] `pnpm --filter web test:coverage` OK
- [ ] Smoke manual: carga page, mutation con toast, error de form con Alert
```

---

## Smoke manual (UX híbrida)

| Acción                              | Esperado                            |
| ----------------------------------- | ----------------------------------- |
| Submit form inválido                | `Alert` rojo inline, sin toast      |
| Guardar / crear / eliminar OK       | Toast verde (`notifySuccess`)       |
| Acción en page sin form (ej. media) | Toast rojo si falla (`notifyError`) |
| Login inválido                      | `Alert` en login (referencia)       |

---

## Enlaces rápidos

| Recurso           | Ruta                                  |
| ----------------- | ------------------------------------- |
| Checklist feature | [new-feature.md](./new-feature.md)    |
| Scripts y testing | [tooling.md](./tooling.md)            |
| Arquitectura web  | [architecture.md](../architecture.md) |
| SWR keys          | `apps/web/src/shared/api/keys.ts`     |
| Notify helpers    | `apps/web/src/shared/ui/notify.ts`    |
