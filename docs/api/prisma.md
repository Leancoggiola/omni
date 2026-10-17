# Prisma — Comandos útiles

Todos los comandos se corren desde `apps/api/`.

---

## Migraciones

### `pnpm prisma migrate dev`

Crea una nueva migración a partir de los cambios en `schema.prisma` y la aplica en la BD local. Pide un nombre para el archivo de migración.

```bash
pnpm prisma migrate dev --name add_user_avatar
```

> Usa la `DIRECT_URL` (conexión directa sin pooler). No usar en producción.

---

### `pnpm prisma migrate deploy`

Aplica todas las migraciones pendientes **sin crear nuevas**. Para usar en CI/CD y producción.

```bash
pnpm prisma migrate deploy
```

---

### `pnpm prisma migrate reset`

**Destructivo.** Elimina toda la BD y re-aplica todas las migraciones.

```bash
pnpm prisma migrate reset
```

> Usar solo en desarrollo para limpiar y reinicializar la BD desde cero.

---

### `pnpm prisma migrate status`

Muestra qué migraciones están aplicadas y cuáles están pendientes.

```bash
pnpm prisma migrate status
```

---

### Objetos que viven solo en el SQL

Prisma no modela los índices parciales ni los `CHECK`: se escriben a mano en la migración y no aparecen en `schema.prisma`. `prisma migrate diff` los ignora, así que no generan drift.

| Objeto                                                    | Migración                              | Para qué                                                               |
| --------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| `PantryShoppingListItem_pantryProductId_auto_pending_key` | `20261017120000_lifestyle_consistency` | A lo sumo un ítem AUTO pendiente por producto (`generateShoppingList`) |
| `ExpenseReminder_anchorDay_check`                         | `20261017120000_lifestyle_consistency` | `anchorDay` entre 1 y 31                                               |

Si una migración futura toca esas tablas, revisá el SQL generado: no debe borrarlos.

---

## Schema & cliente

### `pnpm prisma generate`

Regenera el cliente de Prisma a partir del `schema.prisma`. Necesario después de cambiar el schema sin migrar.

```bash
pnpm prisma generate
```

> El output está en `src/generated/prisma/`.

---

### `pnpm prisma db push`

Sincroniza el schema con la BD **sin crear un archivo de migración**. Útil para prototipar cambios rápidos.

```bash
pnpm prisma db push
```

> No deja historial de cambios. No recomendado para producción.

---

## Seed

### `pnpm prisma db seed`

Ejecuta el script `prisma/seed.ts` manualmente. Crea el usuario admin y datos de desarrollo.

```bash
pnpm prisma db seed
```

> Requiere `ADMIN_USERNAME` y `ADMIN_PASSWORD` en el `.env`.

---

## Inspección

### `pnpm prisma studio`

Abre una UI web en `http://localhost:5555` para explorar y editar la BD visualmente.

```bash
pnpm prisma studio
```

---

### `pnpm prisma db pull`

Genera un `schema.prisma` a partir de una BD existente (ingeniería inversa).

```bash
pnpm prisma db pull
```

---

## Configuración de conexión

| Variable       | Uso                                                     |
| -------------- | ------------------------------------------------------- |
| `DATABASE_URL` | Runtime de la app (con `?pgbouncer=true` para Supabase) |
| `DIRECT_URL`   | CLI de Prisma: migraciones y seed (conexión directa)    |

El `prisma.config.ts` usa `DIRECT_URL` para que las migraciones no se cuelguen con el connection pooler de Supabase.
