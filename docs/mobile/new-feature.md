# Nuevo feature mobile

Checklist paralelo a [web/new-feature.md](../web/new-feature.md).

1. ¿Contrato nuevo? → `packages/shared` primero, luego API si hace falta.
2. Scaffold: `pnpm new-feature <name> --mobile` (sin `--web` ni `--mobile` genera los dos clientes). Genera `src/features/<name>/<Name>Screen.tsx` (con `Screen` y `ScreenHeader`) e `index.ts`, y lista los pasos que faltan.
3. Estructura: ver [Estructura de features](../architecture.md#estructura-de-features-web-y-mobile) en `docs/architecture.md`.
4. Endpoints en `API_PATHS` de [`@omni/shared/api`](../../packages/shared/src/api/paths.ts) (mobile los usa como `API_KEYS`); hooks en `src/features/<name>/hooks/`.
5. Screen armada con `@/shared/ui`: `Screen` como contenedor (con `insetBottom` si es ruta de stack; ninguna ruta tiene header nativo, así que el inset de la status bar va siempre) y `ScreenHeader` arriba (con `onBack` en rutas de stack), contenido en `SectionCard`, `LoadingState` / `EmptyState` / `ErrorState` para los estados (el `error` de SWR siempre visible), `notify*` para feedback y `confirm()` para acciones destructivas. Nada de `Alert.alert` ni de medidas `$4` sueltas; la prop `size` de los componentes de Tamagui sí se usa (ver `apps/mobile/CLAUDE.md`).
6. Ruta Expo Router en `app/` (tab en `(tabs)/` o de stack) que solo importa `@/features/<name>`.
7. Navegación: sumar `"mobile"` a `availableOn` del módulo en `NAV_REGISTRY` ([`@omni/shared/navigation`](../../packages/shared/src/navigation/registry.ts)), la ruta en `NAV_HREFS` y el ícono en `NAV_ICONS` (`apps/mobile/src/shared/navigation/`). Sin eso el módulo sigue como "Próximamente" en "Más".
8. Auth: asumir Bearer ya configurado; no usar cookies.
9. Verificar: `pnpm --filter mobile check-types && pnpm --filter mobile lint && pnpm --filter mobile check-api-paths && pnpm --filter mobile test`.

Si el feature también va a web, implementar ambos clientes en el mismo PR de producto o PRs enlazados; shared/API una sola vez.
