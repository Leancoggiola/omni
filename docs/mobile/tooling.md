# Mobile — tooling (scripts)

Convenciones de `apps/mobile`: [apps/mobile/CLAUDE.md](../../apps/mobile/CLAUDE.md) (Claude Code lo carga al trabajar en esa carpeta). Índice general: [CLAUDE.md](../../CLAUDE.md).

## Scripts

```bash
pnpm dev:mobile
pnpm --filter mobile check-types
pnpm --filter mobile lint
pnpm --filter mobile prebuild
```

Env: `apps/mobile/.env` ← `EXPO_PUBLIC_API_URL` (ver [apps/mobile/README.md](../../apps/mobile/README.md)).

## Relación con web

| Tema      | Web            | Mobile               |
| --------- | -------------- | -------------------- |
| UI        | Mantine        | Tamagui              |
| Auth      | Cookies        | Bearer + SecureStore |
| Paths     | `SWR_KEYS`     | `API_KEYS`           |
| Contratos | `@omni/shared` | `@omni/shared`       |

Nuevo feature: [new-feature.md](./new-feature.md). Web: [web/tooling.md](../web/tooling.md).
