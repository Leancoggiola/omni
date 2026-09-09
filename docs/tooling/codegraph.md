# CodeGraph

[Indexa el monorepo](https://github.com/codegraph-ai/CodeGraph) en SQLite local y expone un **MCP** para consultar símbolos, callers y contexto sin encadenar `grep`/`read`.

Complementa [AGENTS.md](../../AGENTS.md) y [architecture.md](../architecture.md). No define requisitos de producto.

---

## Setup (una vez por máquina)

```bash
pnpm install
pnpm codegraph:init
```

En **VS Code**, el servidor **codegraph** está declarado en `.vscode/mcp.json`. Si no aparece, recargá la ventana.

---

## Comandos

| Comando                 | Uso                            |
| ----------------------- | ------------------------------ |
| `pnpm codegraph:init`   | Crear `.codegraph/` e indexar  |
| `pnpm codegraph:status` | Ver si el índice está al día   |
| `pnpm codegraph:sync`   | Re-indexar tras muchos cambios |

CLI directa (sin chat):

```bash
npx @colbymchenry/codegraph query "useMediaMutations"
npx @colbymchenry/codegraph callers "addToList"
npx @colbymchenry/codegraph context "flujo JWT refresh"
```

---

## Cuándo pedirlo al agente

```markdown
Antes de refactorizar media.service.ts, usá CodeGraph:

- callers de addToList
- impacto del cambio
  Después proponé el plan siguiendo AGENTS.md.
```

| Situación         | Tool MCP                                |
| ----------------- | --------------------------------------- |
| Impacto / rename  | `codegraph_impact`, `codegraph_callers` |
| Flujo desconocido | `codegraph_context`                     |
| Buscar símbolo    | `codegraph_search`                      |

| No usar CodeGraph para                             |
| -------------------------------------------------- |
| Convención de carpetas → `architecture.md`         |
| Cómo escribir hooks → rule `web-swr-hooks` + skill |
| String literal puntual → `grep`                    |

---

## Privacidad y git

- Datos solo en tu máquina (`.codegraph/*.db`).
- No commitear la base — ver `.codegraph/.gitignore` y `.gitignore` en la raíz.
