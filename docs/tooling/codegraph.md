# CodeGraph

[Indexa el monorepo](https://github.com/colbymchenry/codegraph) en SQLite local y expone un **MCP con una sola tool**, `codegraph_explore`, para consultar símbolos, callers y flujos sin encadenar `grep`/`read`.

Complementa [AGENTS.md](../../AGENTS.md) y [architecture.md](../architecture.md). No define requisitos de producto.

---

## Setup (una vez por máquina)

```bash
pnpm install
pnpm codegraph:init
```

En **VS Code**, el servidor **codegraph** está declarado en `.vscode/mcp.json`. Si no aparece, recargá la ventana.

Auto-sync está activo por defecto (file watcher nativo, debounce de 2s): **no hace falta re-indexar a mano**. Si igual sospechás que el índice quedó desactualizado, `pnpm codegraph:status` lo confirma.

---

## Comandos

| Comando                 | Uso                           |
| ----------------------- | ----------------------------- |
| `pnpm codegraph:init`   | Crear `.codegraph/` e indexar |
| `pnpm codegraph:status` | Ver si el índice está al día  |

CLI directa (sin MCP, sin chat):

```bash
npx @colbymchenry/codegraph query "useMediaMutations"
npx @colbymchenry/codegraph callers "addToList"
npx @colbymchenry/codegraph explore "flujo JWT refresh"
```

---

## Cuándo usarlo

El MCP expone **una sola tool: `codegraph_explore`** (las demás — `node`, `search`, `callers`, `callees`, `impact`, `files`, `status` — existen pero quedan ocultas del catálogo a propósito).

`codegraph_explore` gana por _amortización_: reemplaza una cadena larga de grep→read→grep→read
con una sola llamada. Para un lookup de un solo salto, las tools nativas son más baratas —
prenderlo no las reemplaza, se suma al catálogo.

| Situación                                              | Herramienta                            |
| ------------------------------------------------------ | -------------------------------------- |
| Flujo o impacto cruzando `api`/`shared`/`web`/`mobile` | `codegraph_explore` (una sola llamada) |
| Referencias de un símbolo TS en el mismo proyecto      | usages nativo — más preciso            |
| String literal puntual                                 | búsqueda de texto nativa               |
| Convención de carpetas                                 | `architecture.md`                      |

Reglas para no pagar el contexto dos veces:

- Una sola llamada a `codegraph_explore` por tarea — es punto de entrada, no tool de iteración.
- No releer con `read_file`/grep lo que `explore` ya devolvió en el mismo turno.
- Formular la consulta como flujo ("flujo JWT refresh shared→api→web"), no como ubicación
  ("dónde está useAuth" es un usages, no un explore).

---

## Privacidad y git

- Datos solo en tu máquina (`.codegraph/*.db`).
- No commitear la base — ver `.codegraph/.gitignore` y `.gitignore` en la raíz.
