# Arquitectura de tooling IA — Omni

Cómo está armado el soporte de agentes de IA en este repo (Copilot/VS Code): qué corre en cada
capa, qué se sacó y por qué, y qué es responsabilidad de cada máquina vs. del repo commiteado.

---

## Arquitectura

```
VS Code / GitHub Copilot
        │
        ├── Tools nativas ─── search, read, edit, terminal, browser, usages, #web/fetch
        │
        ├── MCP (.vscode/mcp.json, commiteado)
        │     ├── supabase   — SQL, RLS, advisors
        │     ├── codegraph  — 1 sola tool: codegraph_explore
        │     └── mantine    — 4 tools: docs/props en vivo
        │
        ├── Tool Sets (perfil de usuario, NO commiteado)
        │     ├── omni-explore — codegraph/* + usages + textSearch + codebase
        │     └── omni-verify  — runInTerminal + getTerminalOutput + problems + testFailure
        │
        ├── Custom agents (.github/agents/, commiteado)
        │     ├── backend  → apps/api, prisma, packages/shared
        │     ├── web      → apps/web
        │     ├── mobile   → apps/mobile
        │     ├── qa       → apps/e2e
        │     └── review   → read-only, sin edit/terminal
        │
        ├── Instructions (.github/instructions/*.instructions.md, applyTo por glob)
        ├── Skills (.github/skills/ propias · .agents/skills/ terceros)
        └── AGENTS.md — hub corto: mapa, reglas de oro, índice
        │
RTK (hook de terminal, por máquina) ─── comprime el output de git/pnpm/test/lint/gh
```

Ningún agent duplica instructions: linkean. Ninguna instruction duplica skills: las referencia
en una línea. `docs/` no repite reglas: explica y linkea a la fuente única.

---

## Estrategia de tokens

| Capa                                  | Qué es                   | Cuándo pesa                             |
| ------------------------------------- | ------------------------ | --------------------------------------- |
| `AGENTS.md` + instructions aplicables | Contexto siempre cargado | En cada request                         |
| Skills                                | Bajo demanda             | Solo si el agent decide usarla          |
| Custom agents                         | Opt-in                   | Solo si el usuario selecciona ese agent |
| MCP tool definitions                  | Catálogo de tools        | En cada request, por servidor activo    |
| `codegraph_explore` / RTK             | Output de una tool call  | Solo cuando se invoca                   |

Prioridad de optimización (de mayor a menor impacto real): **MCP activos** (definiciones que
viajan siempre que el servidor está prendido) → **contexto siempre cargado** (AGENTS.md +
instructions) → **skills y docs** (pull-based, solo pesan si se leen).

---

## Estrategia MCP

| Servidor         | Decisión           | Motivo                                                                                          |
| ---------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| `supabase`       | DIRECT (workspace) | Necesario para SQL/RLS/advisors del proyecto                                                    |
| `codegraph`      | DIRECT (workspace) | 1 sola tool, navegación estructural que la TS language server no cubre (blast radius cross-app) |
| `mantine`        | DIRECT (workspace) | 4 tools, oficial, versión exacta del repo (9.6.1)                                               |
| `github`         | **REMOVIDO**       | Reemplazado por `gh` CLI + RTK (`rtk gh pr/issue/run`)                                          |
| `playwright`     | **REMOVIDO**       | Reemplazado por browser tools nativas de VS Code                                                |
| `filesystem`     | **REMOVIDO**       | Redundante con read/search/edit nativos; apuntaba a todo `D:/Proyectos`                         |
| `fetch`          | **REMOVIDO**       | Redundante con `#web/fetch` nativo                                                              |
| `Vercel`         | **REMOVIDO**       | Uso real casi nulo, queda fuera de la config del repo                                           |
| `mcp-compressor` | NO INSTALADO       | Con 3 servidores (2 ya minimalistas) no se justifica una capa de proxy extra                    |
| `mcp-lazy-proxy` | DESCARTADO         | v0.2.0, 6 meses sin publicar, sin soporte HTTP/SSE                                              |

Las definiciones de tools MCP viajan en **cada request** mientras el servidor esté prendido,
aunque no se invoquen — es el costo fijo más caro de la lista, más que cualquier regla de uso
de `codegraph_explore`. `supabase` y `mantine` valen la pena apagarlos (Extensions → MCP Servers)
fuera de sesiones de SQL/RLS/migraciones o de `apps/web` con Mantine, respectivamente.

---

## CodeGraph

Expone **una sola tool MCP: `codegraph_explore`**. El resto del CLI (`node`, `search`, `callers`,
`callees`, `impact`, `files`, `status`) sigue existiendo pero queda oculto del catálogo a
propósito — todo lo que devuelven ya viene inline en `codegraph_explore`.

Regla de uso (ver `AGENTS.md`): reservado para flujo o impacto que cruza `api`/`shared`/`web`/
`mobile`. Para referencias de un símbolo TS dentro del mismo proyecto, el usages nativo es más
preciso. Nunca `sync` manual — auto-sync por file watcher.

Detalle: [codegraph.md](./codegraph.md).

---

## RTK

Corre como hook de terminal (`~/.copilot/hooks/rtk-rewrite.json`), instalado por máquina, no por
repo. Comprime el output de `git`, `pnpm`, tests, lint y `gh` antes de que llegue al agente.
**No reduce tool definitions ni contexto estático** — solo output de comandos ya ejecutados.
Comandos persistentes (`expo start`, `vite`, `turbo run dev`) están excluidos en
`%APPDATA%\rtk\config.toml` para no romper la detección de que siguen corriendo.

---

## Operación

| Qué                      | Dónde vive                                        | ¿Commiteado?                                         |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------- |
| MCP servers del proyecto | `.vscode/mcp.json`                                | Sí                                                   |
| Custom agents            | `.github/agents/*.agent.md`                       | Sí                                                   |
| Instructions             | `.github/instructions/*.instructions.md`          | Sí                                                   |
| Skills propias           | `.github/skills/**/SKILL.md`                      | Sí                                                   |
| Skills de terceros       | `.agents/skills/**` (via `skills-lock.json`)      | Sí                                                   |
| CodeGraph — índice       | `.codegraph/*.db`                                 | No (gitignored, se reconstruye con `codegraph init`) |
| RTK — hook y config      | `~/.copilot/hooks/`, `%APPDATA%\rtk\config.toml`  | No — por máquina                                     |
| Tool Sets                | `%APPDATA%\...\User\prompts\tools.toolsets.jsonc` | No — perfil de usuario, no workspace                 |

Un checkout nuevo del repo funciona sin RTK/CodeGraph/Tool Sets instalados — son mejoras
opcionales por máquina, no dependencias duras.

---

## Riesgos conocidos

1. **CodeGraph deja más contexto residual en sesiones largas** (medido por su propio autor:
   ~80% más que una sesión sin él). Mitigado con la regla de uso acotada, no con desinstalarlo.
2. **RTK y CodeGraph no son portables al Agent Host** de la misma forma que al VS Code local —
   son integraciones por máquina.
3. **`${input:supabaseAccessToken}`** en `.vscode/mcp.json` no es portable a sesiones de Agent
   Host remoto; localmente funciona vía prompt interactivo.
4. Sacar el MCP de GitHub asume que `gh` CLI + RTK cubren crear PRs y diagnosticar pipelines. Si
   en la práctica no alcanza, es reversible.

---

## Instalación (por máquina, opcional)

```powershell
# RTK — comprime output de terminal
winget install rtk-ai.rtk
winget install BurntSushi.ripgrep.MSVC
rtk init -g --copilot

# CodeGraph — 1 tool MCP + CLI
irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex
pnpm codegraph:init
```

Verificación: `rtk --version` · `rtk gain` · `codegraph version` · `pnpm codegraph:status`.
