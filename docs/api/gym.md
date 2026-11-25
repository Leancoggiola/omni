# Gimnasio

Planes de entrenamiento por usuario, organizados por día de la semana, con un catálogo de ejercicios compartido entre planes y el historial de peso de cada uno. No se comparte con el hogar.

Contrato en `@omni/shared/gym` (schemas, tipos, `GYM_WEEKDAY_LABELS`); paths en `API_PATHS.gym` de `@omni/shared/api`.

## Modelo

| Tabla                    | Rol                                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `GymPlan`                | Plan con nombre obligatorio, `ACTIVE` o `ARCHIVED` (`archivedAt` guarda cuándo se archivó).                                             |
| `GymPlanDay`             | Día del plan: `weekday` (`MONDAY`…`SUNDAY`). Único por plan. Se ordena de lunes a domingo por el orden del enum; no tiene orden propio. |
| `GymExercise`            | **Catálogo** del usuario. Cada fila es una variante: nombre + series + repeticiones, con su peso actual (`currentWeightKg`).            |
| `GymPlanExercise`        | Un ejercicio dentro de un día: apunta a la variante del catálogo y guarda su posición (`sortOrder`). Único por día + variante.          |
| `GymExerciseWeightEntry` | Historial de peso de una variante, con las series y repeticiones que tenía al registrarlo.                                              |

Los clientes muestran el día con `GYM_WEEKDAY_LABELS` (como `MEDIA_STATUS_LABELS` en media): la API devuelve solo `weekday`.

## Catálogo de variantes

"Sentadilla 4×12" y "Sentadilla 3×8" son dos variantes distintas, cada una con su peso e historial. Dos ejercicios son la misma variante si coinciden:

- **Nombre** sin mayúsculas ni espacios en los bordes (`nameNormalized`).
- **Series**, incluido "sin series" (`null`): "Plancha ×60s" sin series es otra variante que "Plancha 3×60s".
- **Repeticiones** sin espacios ni mayúsculas (`repsNormalized`): `8-12` = `8 - 12`, `AMRAP` = `amrap`.

La unicidad la cubren `@@unique([userId, nameNormalized, sets, repsNormalized])` y, para `sets` nulo, el índice parcial `GymExercise_userId_nameNormalized_repsNormalized_no_sets_key` (ver [prisma.md](./prisma.md)). El nombre y las repeticiones que se muestran son los de la variante: agregar "SENTADILLA" cuando ya existe "Sentadilla" reutiliza la variante y sigue mostrando "Sentadilla".

Compartir la variante significa que **nombre, series, repeticiones y peso son los mismos en todos los planes que la usan**, archivados incluidos: editarla desde un plan activo cambia lo que muestra un plan archivado.

## Reglas

- **Plan archivado = solo lectura.** Renombrarlo, tocar sus días o sus ejercicios, reordenar y cargar peso responden 409 `El plan está archivado`. Se puede leer, borrar, archivar y desarchivar.
- **Archivar y desarchivar son idempotentes.** Archivar un plan ya archivado responde 200 sin tocar `archivedAt`; desarchivar uno activo responde 200 tal cual.
- **Días implícitos.** Un día existe mientras tenga ejercicios: se crea al agregar el primero y se borra al quedar vacío (al borrar o mover su último ejercicio). El plan nunca se borra por quedar vacío.
- **Mover un día** a otro día de la semana que el plan ya tiene responde 409 `El plan ya tiene ese día`; no se fusionan.
- **Agregar un ejercicio** reutiliza la variante del catálogo si existe (con su peso e historial) o la crea. La misma variante dos veces en el mismo día responde 409 `El ejercicio ya está en ese día`; en otro día del plan está permitido y comparte todo.
- **Editar un ejercicio** (`name`, `sets`, `reps`) edita la variante en todos los planes. Si queda igual a otra variante existente responde 409 `Ya existe un ejercicio con ese nombre, series y repeticiones`; no se fusionan. `weekday` mueve solo esa fila al final del día indicado.
- **Reordenar** recibe la lista completa de ids del día. Si no coincide exactamente con los ejercicios actuales (falta uno, sobra uno o es de otro día) responde 409; ids repetidos son 400.
- **Concurrencia.** Toda escritura del gimnasio corre en una transacción que primero toma un lock por usuario (`lockGymUser`, `pg_advisory_xact_lock` con clave `gym:<userId>`) y recién entonces relee y valida el plan, así que dos pedidos del mismo usuario se serializan y el segundo ve el estado ya confirmado del primero (archivado, día vaciado, variante renombrada). Usuarios distintos no se bloquean entre sí.
- **Borrar** un plan, un día o un ejercicio borra también las variantes del catálogo que ya no usa ningún plan (archivados incluidos), con su historial. Una variante que otro plan sigue usando se conserva.

## Historial de peso

Se agrega una entrada, con las series y repeticiones actuales de la variante, cuando:

- `PATCH /exercises/:id/weight` cambia el peso a un valor distinto del anterior. Repetir el mismo peso o borrarlo (`null`) no registra nada.
- `PATCH /exercises/:id` cambia las series o las repeticiones de una variante que tiene peso cargado (el peso no cambia, pero ya no es el mismo esfuerzo). Cambiar solo el nombre no registra nada.

No hay endpoints para corregir ni borrar entradas. El historial se lee paginado, del más nuevo al más viejo, también en planes archivados.

## Endpoints

Todos bajo `/api/gym`, con JWT. Un recurso de otro usuario responde 404.

| Endpoint                                           | Respuesta              | Qué hace                                                          |
| -------------------------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| `GET /plans?page&limit&status`                     | `{ items, total, … }`  | Resúmenes (`dayCount`, `exerciseCount`)                           |
| `GET /plans/:planId`                               | `GymPlanDetail`        | Plan con sus días y ejercicios                                    |
| `POST /plans`                                      | 201 `GymPlanDetail`    | Crea un plan (`name` obligatorio)                                 |
| `PATCH /plans/:planId`                             | `GymPlanDetail`        | Renombra                                                          |
| `DELETE /plans/:planId`                            | 204                    | Borra el plan (activo o archivado)                                |
| `POST /plans/:planId/archive`                      | `GymPlanDetail`        | Archiva (idempotente)                                             |
| `POST /plans/:planId/unarchive`                    | `GymPlanDetail`        | Desarchiva (idempotente)                                          |
| `PATCH /days/:dayId`                               | `GymPlanDetail`        | Pasa el día a otro `weekday`                                      |
| `DELETE /days/:dayId`                              | 204                    | Borra el día con sus ejercicios                                   |
| `PUT /days/:dayId/exercises/order`                 | `GymPlanDetail`        | Reordena los ejercicios del día (`exerciseIds`)                   |
| `POST /exercises`                                  | 201 `GymPlanDetail`    | Agrega un ejercicio (`planId`, `weekday`, `name`, `sets`, `reps`) |
| `PATCH /exercises/:exerciseId`                     | `GymPlanDetail`        | Edita la variante y/o mueve la fila de día                        |
| `PATCH /exercises/:exerciseId/weight`              | `GymExercise`          | Carga el peso de la variante                                      |
| `DELETE /exercises/:exerciseId`                    | 204                    | Saca el ejercicio del día                                         |
| `GET /exercises/:exerciseId/weight-history`        | `{ items, total, … }`  | Historial de la variante de ese ejercicio                         |
| `GET /exercises/catalog?q&limit`                   | `GymCatalogExercise[]` | Variantes del catálogo por nombre (`q` opcional, máx. 20)         |
| `GET /exercises/catalog/:catalogId/weight-history` | `{ items, total, … }`  | Historial de una variante del catálogo                            |

`:exerciseId` es el id de la fila del plan (`GymExercise.id` en la respuesta); `catalogId` es el de la variante.

## Migración

`20261117120000_gym_catalog_weekdays_history` reestructura las tablas sin trasladar filas: el módulo no tenía datos. Si encuentra planes o ejercicios, aborta antes de tocar nada.
