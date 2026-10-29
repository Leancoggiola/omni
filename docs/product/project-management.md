# Gestión de proyecto (Omni)

Fuente de verdad del flujo PM en GitHub. Idioma: **español**.

| Recurso | Valor                                                                     |
| ------- | ------------------------------------------------------------------------- |
| Repo    | `Leancoggiola/omni`                                                       |
| Project | **Omni Roadmap** ([#1](https://github.com/users/Leancoggiola/projects/1)) |
| Owner   | `Leancoggiola`                                                            |

## Tablero

Columnas (Status):

1. **Backlog** — ideas / issues sin priorizar del todo
2. **Listo** — relevamiento y criterios claros; se puede empezar
3. **En progreso** — branch activo
4. **En revisión** — PR abierto
5. **Hecho** — mergeado / cerrado

Campos del Project: **Prioridad** (P0/P1/P2), **Área** (api/web/mobile/shared/infra/docs), **Tamaño** (S/M/L).

## Labels

| Prefijo      | Valores                                           |
| ------------ | ------------------------------------------------- |
| `tipo:`      | `historia`, `bug`, `chore`, `spike`, `epic`       |
| `area:`      | `api`, `web`, `mobile`, `shared`, `infra`, `docs` |
| `prioridad:` | `p0`, `p1`, `p2`                                  |
| extra        | `bloqueado`                                       |

Usá los issue templates en `.github/ISSUE_TEMPLATE/`.

## Flujo issue → branch → PR

1. Crear issue (template) y agregarlo a **Omni Roadmap** (Backlog).
2. Completar relevamiento; solo entonces mover a **Listo**.
3. Al empezar: branch + Status **En progreso** (manual).
4. Al abrir PR: body con `Closes #N`; el workflow `project-status.yml` pasa la tarjeta a **En revisión**.
5. Al merge: el issue cierra y el mismo workflow pasa la tarjeta a **Hecho**.

### Convención de branch

```text
feat/#N-slug-corto
fix/#N-slug-corto
chore/#N-slug-corto
```

Ejemplo: `feat/#12-marcar-visto`.

### Convención de PR

- Título: `<type>(#N): descripción`, con `#N` como scope (ej. `feat(#12): marcar película como vista`). Lo valida el workflow **PR Title** porque semantic-release lee ese título (ver [commits-and-releases.md](../ops/commits-and-releases.md)). Los commits de la rama aceptan scope de paquete o `#N`.
- Body: `Closes #N` o `Fixes #N` (template en `.github/pull_request_template.md`).

## Orden full-stack

Si la historia toca contrato API↔clientes: **`shared` → `api` → web y/o mobile** (ver [CLAUDE.md](../../CLAUDE.md)).

### Workflow `project-status.yml`

Mueve las tarjetas de los issues que el PR enlaza con `Closes #N` (las que GitHub reconoce como `closingIssuesReferences`): a **En revisión** al abrir o reabrir el PR y a **Hecho** al mergearlo. Un issue que no esté en Omni Roadmap se omite con un aviso.

Necesita el secret del repo `PROJECT_TOKEN`: un PAT **clásico** con el único scope `project`. El `GITHUB_TOKEN` y los PAT de grano fino no acceden a los Projects v2 de un usuario. Si falla con `Falta el secret PROJECT_TOKEN`, el token no está cargado o venció.

## Checklist de relevamiento (antes de Listo)

No asumir. Preguntar y documentar en el issue:

1. **Rol** — ¿quién es el usuario?
2. **Problema** — ¿qué dolor resuelve?
3. **Beneficio** — ¿para qué lo quiere?
4. **Alcance** — ¿web, mobile, api, shared?
5. **Fuera de alcance** — ¿qué no entra?
6. **Criterios de aceptación** — checklist verificable
7. **Prioridad** — P0 / P1 / P2
8. **Dependencias** — ¿bloquea o depende de otro issue?
9. **Éxito** — ¿cómo sabemos que está hecho?

## CLI útil (`gh`)

```bash
# Issues
gh issue create --repo Leancoggiola/omni
gh issue list --repo Leancoggiola/omni
gh issue view N --repo Leancoggiola/omni

# Project (requiere scopes project / read:project)
gh project list --owner Leancoggiola
gh project view 1 --owner Leancoggiola --web
gh project item-add 1 --owner Leancoggiola --url https://github.com/Leancoggiola/omni/issues/N

# PR ligado al ticket
gh pr create --title "feat(#N): ..." --body "Closes #N"
```

## Regla PM

Ante duda de alcance, meta o prioridad: **preguntar** antes de crear el issue o mover a **Listo**.
