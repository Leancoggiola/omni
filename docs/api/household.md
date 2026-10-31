# Hogar compartido (#59 / #222)

Dos personas comparten alacena (productos y lista de compras) y la lista de películas y series. Gimnasio, gastos y el resto siguen siendo por usuario.

## Modelo

| Tabla             | Rol                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Household`       | Contenedor de los datos compartidos.                                                                                            |
| `HouseholdMember` | `userId` único: una persona está en un solo hogar. Máximo 2 por hogar.                                                          |
| `HouseholdInvite` | Código de un solo uso, hasheado (HMAC-SHA256 con clave derivada del secreto de refresh), vigente 48 h, revocable (`revokedAt`). |

`MediaItem`, `PantryProduct` y `PantryShoppingListItem` pasan de `userId` a `householdId` y guardan `createdById` (nullable, `SetNull` al borrar la cuenta). La migración `20261031120000_household_sharing` da un hogar a cada usuario existente (`hh_<userId>`) y rellena ambas columnas.

## Reglas

- **Máximo 2 integrantes** y cambios de integrantes serializados con `lockHouseholds` (advisory lock por hogar, en orden de id).
- **Invitación:** un código vivo por hogar (generar otro revoca el anterior). Vencido, usado, revocado o inexistente responden igual (404). `preview` y `accept` comparten un rate limit estricto (10 por 15 min); generar el código tiene el suyo, más laxo. Rotar `JWT_REFRESH_SECRET` invalida las invitaciones pendientes, porque la clave del HMAC deriva de él.
- **Unión:** los repetidos (película por `tmdbId` + tipo, producto por nombre normalizado) quedan con el registro del hogar que recibe. Los ítems de compra que apuntaban a un producto descartado pasan al equivalente del hogar que recibe.
- **Desvincular:** quien se va recibe un hogar nuevo con una copia del estado actual; quien se queda conserva todo. No requiere aprobación.
- **Borrar la cuenta** equivale a desvincular sin copia; el hogar se elimina solo si era el último integrante.

## Endpoints

`GET /api/household` · `POST /api/household/invite` · `DELETE /api/household/invite` · `POST /api/household/invite/preview` · `POST /api/household/invite/accept` · `POST /api/household/leave`

## RLS (verificado en `omni-dev`, solo lectura)

Relevado el 2026-10-31 con la Management API de Supabase:

- Los advisors de seguridad no devuelven hallazgos.
- RLS está **desactivado** en todas las tablas de `public` (incluidas `MediaItem`, `PantryProduct`, `PantryShoppingListItem`) y no hay policies.
- `anon` y `authenticated` tienen todos los privilegios sobre esas tablas.
- La Data API (PostgREST) tiene `db_schema` vacío: no expone ningún esquema, así que hoy las tablas no son accesibles por ese camino.

La API de Express sigue siendo la única puerta, como se decidió en #59; la regla pasa de "es mío" a "es de mi hogar". Las tablas nuevas (`Household*`) siguen la misma postura. Si algún día se expone `public` por la Data API, hay que activar RLS y quitar los grants a `anon`/`authenticated` antes de hacerlo. Producción no se consultó.
