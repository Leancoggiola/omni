# Dividir gastos (mobile)

Juntadas con gastos como un feed de chat, saldos y amigos (#135). Misma API y mismos contratos que web; diseño en el canvas [Omni · División de gastos](https://claude.ai/artifact/T15fsZDQX4aasss1MLLUjF).

## Rutas

| Ruta                      | Archivo                          | Pantalla              |
| ------------------------- | -------------------------------- | --------------------- |
| `/split-expenses`         | `app/(tabs)/split-expenses.tsx`  | `SplitExpensesScreen` |
| `/split-expenses/[id]`    | `app/split-expenses/[id].tsx`    | `GatheringScreen`     |
| `/split-expenses/friends` | `app/split-expenses/friends.tsx` | `FriendsScreen`       |

Se abre desde "Más". La lista de juntadas es una **tab oculta** (`MORE_CHILD_ROUTES` en `shared/navigation/tabs.ts`): conserva la tab bar con "Más" marcado, tocar "Más" vuelve ahí y el Atrás de Android también. Las otras dos son rutas de stack, en `SESSION_ROUTES`.

Es un módulo sensible: las tres pantallas van dentro de `<SensitiveGate module="split-expenses">`.

## Datos

Hooks en `features/split-expenses/hooks`, con keys de `API_KEYS.splitExpenses`:

| Hook                        | Pide                                                             |
| --------------------------- | ---------------------------------------------------------------- |
| `useGatherings`             | Las primeras 50 juntadas, con `lastExpense` para la vista previa |
| `useGathering`              | Detalle: participantes, gastos, transferencias                   |
| `useSplitBalance`           | Lo que te deben y lo que debés                                   |
| `useSplitFriends`           | Amigos con su saldo en las juntadas activas                      |
| `useSplitExpensesMutations` | Escrituras; todas revalidan las keys del módulo (`isSplitKey`)   |

La lógica compartida con web (reparto, textos de saldos, fechas del feed y los formularios de juntada y amigo) vive en `@omni/shared/split-expenses`.

## Comportamiento

- **Carga rápida** (pie del feed): un solo campo, `"27000 Bebidas"`. El número inicial es el monto (acepta `27.000,50` y `27000.50`) y el resto, el detalle. Se envía desde el teclado y se divide entre todos. El `+` abre la hoja completa con eso cargado.
- **Nuevo gasto** (hoja): monto, detalle, quién pagó y entre quiénes. Con todos elegidos no se manda `sharedWith`.
- **Borrar**: tocar un gasto abre "Eliminar gasto"; ⋯ abre "Eliminar juntada". Las dos piden `confirm()`.
- **Saldar cuentas** marca la juntada entera; no hay pagos por transferencia (igual que web).
- **Saldada**: solo lectura, con "Reabrir" y "Compartir" (`Share` nativo, con los nombres reales).
- **Nueva juntada**: "Otra" pide `dd/mm/aaaa` sin fechas futuras; "Amigo nuevo" suma a alguien solo por nombre, sin guardarlo como amigo.
- **Amigos**: alta con nombre y alias; el lápiz abre la edición, con "Eliminar amigo". El saldo es contra el grupo ("Le deben", "Debe", "Al día"), no contra vos.
- **Una sola persona** (juntadas viejas): aviso y sin carga de gastos; la API no permite sumar participantes.

## Prueba manual

Con la API y la app levantadas: Más → Dividir gastos → Nueva juntada, cargar un gasto desde el pie y otro desde la hoja dividiendo entre algunos, "Saldar" → "Marcar como saldada", "Compartir" y "Reabrir". Revisar en claro y oscuro.
