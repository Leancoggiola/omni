# Commits y Releases

Este proyecto usa **Conventional Commits** + **semantic-release** para automatizar el versionado y el CHANGELOG.

---

## Formato de commits

```
<type>(<scope>): <descripción>
```

### Types

| Type       | Versión que genera  | Cuándo usarlo                         |
| ---------- | ------------------- | ------------------------------------- |
| `feat`     | **minor** (`1.x.0`) | Nueva funcionalidad                   |
| `fix`      | **patch** (`1.0.x`) | Corrección de bug                     |
| `perf`     | **patch**           | Mejora de performance                 |
| `refactor` | —                   | Refactor sin cambio de comportamiento |
| `chore`    | —                   | Tareas de mantenimiento, deps, config |
| `docs`     | —                   | Solo documentación                    |
| `test`     | —                   | Solo tests                            |
| `build`    | —                   | Cambios en el sistema de build        |
| `ci`       | —                   | Cambios en CI/CD                      |
| `style`    | —                   | Formato, espacios (sin lógica)        |
| `revert`   | patch               | Revierte un commit anterior           |

### Título del PR

Los rulesets mergean con el título del PR como mensaje del commit, y semantic-release lee ese título. Por eso el título del PR sigue el mismo formato y lo valida el workflow **PR Title** con `commitlint` (agregarlo a los checks requeridos). Usá `#N` como scope: `feat(#12): marcar película como vista`. Los commits de la rama aceptan scope de paquete o `#N`; se prefiere el de paquete (`feat(web): …`).

> `BREAKING CHANGE:` en el footer (o `!` después del type) genera una versión **major** (`x.0.0`).

---

### Scopes válidos

Definidos en `commitlint.config.ts` (regla `scope-valid`):

| Scope           | Dónde aplica                       |
| --------------- | ---------------------------------- |
| `api`           | `apps/api`                         |
| `web`           | `apps/web`                         |
| `mobile`        | `apps/mobile`                      |
| `shared`        | `packages/shared`                  |
| `eslint-config` | `packages/eslint-config`           |
| `ts-config`     | `packages/typescript-config`       |
| `deps`          | Actualización de dependencias      |
| `release`       | Commits del proceso de release     |
| `ci`            | Workflows de GitHub Actions        |
| `#N`            | Número del issue (ej. `feat(#12)`) |

El scope es **opcional** pero recomendado en un monorepo. Se acepta un scope de paquete o `#N`.

---

### Ejemplos

```bash
feat(api): add refresh token rotation
fix(web): correct avatar upload validation
chore(deps): update prisma to 7.8.0
docs: add prisma command reference
feat(api)!: remove legacy /v1 endpoints   # BREAKING CHANGE → major
```

---

## Hooks locales (Husky)

| Hook         | Cuándo corre           | Qué hace                                               |
| ------------ | ---------------------- | ------------------------------------------------------ |
| `pre-commit` | Antes de cada commit   | `lint-staged`: eslint + prettier sobre archivos staged |
| `commit-msg` | Al escribir el mensaje | `commitlint` valida el formato del mensaje             |
| `pre-push`   | Antes de hacer push    | `prettier --check` + `tsc --noEmit` en todo el repo    |

Si un hook falla, el commit/push se cancela.

---

## Proceso de release

Los releases son **automáticos** al mergear a `main` (workflow **Release & Deploy**, ver [deployment.md](./deployment.md)).

1. `semantic-release` analiza los commits desde el último tag
2. Determina la próxima versión según los types:
   - `fix`/`perf` → patch
   - `feat` → minor
   - `BREAKING CHANGE` → major
3. Actualiza `CHANGELOG.md` y `package.json`, crea el tag y el GitHub Release
4. Si hubo release, deploya en orden: **API** (espera el commit nuevo sano) → **web** (con smoke) → **APK** (solo si cambió `apps/mobile` o `packages/shared`)
5. Hace el back-merge de `main` a `develop`

**Protección de ramas:** `main` y `develop` tienen rulesets (PR, CI verde, sin force-push ni borrado) con bypass de admin. Lo usa semantic-release (`RELEASE_TOKEN`) para el commit de versión y el back-merge. Un hotfix sigue el flujo normal (`fix/#N-…` → PR a `main`); el bypass manual queda solo para emergencias en las que el CI no puede correr. El guard `.husky/pre-push` rechaza pushes directos a `main`/`develop`; se saltea con `ALLOW_PROTECTED_PUSH=1` (en CI, con `CI=true`).

> Commits con `chore`, `docs`, `test`, `ci` etc. **no generan release**.

---

## Flujo de trabajo recomendado

```bash
# Partir siempre de develop (no de main)
git checkout develop
git pull
git checkout -b feat/#N-my-feature

# Commitear con el formato correcto
git commit -m "feat(api): add user avatar endpoint"

# PR hacia develop → CI corre tests, lint, type-check
# main solo para releases a producción o hotfix
```

---

## Configuración

| Archivo                         | Propósito                                |
| ------------------------------- | ---------------------------------------- |
| `.releaserc.json`               | Plugins y config de semantic-release     |
| `commitlint.config.ts`          | Reglas de formato de commits             |
| `lint-staged.config.mjs`        | Qué corre lint-staged sobre qué archivos |
| `.husky/`                       | Hooks de git                             |
| `.github/workflows/release.yml` | Workflow de CI para releases             |
