# Código de barras en la alacena (#259)

Escanear un producto en el súper o al guardar las compras suma stock sin tipear. La API resuelve el código contra la alacena del hogar y, si no está, contra [Open Food Facts](https://world.openfoodfacts.org) (OFF). El cliente mobile es [#260](https://github.com/Leancoggiola/omni/issues/260) (ver [Cliente mobile](#cliente-mobile-260)); la investigación previa (spike #258) está en el [PR #261](https://github.com/Leancoggiola/omni/pull/261).

## Modelo

| Tabla                 | Rol                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `PantryProduct`       | Suma `barcode` (nullable) con `@@unique([householdId, barcode])`: un código identifica a lo sumo un producto por hogar.                       |
| `BarcodeCatalogEntry` | Caché de OFF por código (`barcode` es la clave), compartido entre hogares e instancias. `found: false` registra que el catálogo no lo conoce. |

Migración `20261110120000_pantry_barcode`. `BarcodeCatalogEntry` no guarda nada de un usuario ni de un hogar y sigue la postura de RLS del resto de `public` (ver [household.md](./household.md)). La lectura es por clave. Una fila vencida se pisa en la próxima consulta de ese código. Las de "no existe" además se barren cada vez que se guarda otra (a lo sumo 10 veces por minuto), con el índice `[found, expiresAt]` de la migración `20261111120000_barcode_catalog_expiry_index` para no recorrer la tabla, así el caché no crece con códigos que nadie volvió a consultar; las de productos se conservan vencidas porque son el respaldo cuando OFF falla. Si el barrido falla, la fila nueva igual se guarda.

## Códigos aceptados

Solo EAN-13 y EAN-8 con dígito verificador válido (`pantryBarcodeSchema` de `@omni/shared/pantry`). Los de uso interno de un comercio (balanza, fiambrería, panadería: EAN-13 que empieza con `2`, `02` o `04`; EAN-8 que empieza con `0` o `2`) responden **400** en la consulta y en el escaneo, sin salir a la red: cada local los arma a su manera y no identifican un producto. `isInternalBarcode` está en shared para que el cliente los corte antes de pegarle a la API.

Un UPC-A (12 dígitos, el de los productos importados de Estados Unidos) es el EAN-13 que empieza con cero, y así lo guarda OFF: el cliente lo convierte con `normalizeBarcode` antes de consultar. La API no acepta los 12 dígitos y UPC-E no está soportado.

## Endpoints

Todos bajo `authenticateJwt`; las rutas salen de `API_PATHS.pantry`.

| Endpoint                                     | Qué hace                                                                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/pantry/barcodes/:barcode`          | Resuelve un código: `IN_PANTRY` (con el producto), `FOUND` (con una sugerencia para el formulario) o `NOT_FOUND`. 150 consultas / 15 min. |
| `POST /api/pantry/products/scan`             | Registra el escaneo. 201 si da de alta, 200 si suma a un producto que ya estaba.                                                          |
| `POST /api/pantry/products/:productId/stock` | Suma o resta `delta` al stock sin conocer la cantidad actual. Es el "Deshacer" de un escaneo que sumó (ver [Deshacer](#deshacer)).        |
| `PATCH /api/pantry/products/:productId`      | Acepta `barcode: null` para desvincular el código. No acepta un código: vincular solo se hace escaneando.                                 |

`POST /api/pantry/products` ignora `barcode`; la lista y el detalle de productos lo devuelven.

### Consulta

1. Si un producto del hogar tiene el código responde `IN_PANTRY` sin tocar el catálogo: es el caso de todos los días.
2. Si hay una fila vigente en `BarcodeCatalogEntry` responde desde ahí.
3. Si no, consulta OFF y guarda el resultado: **30 días** si el producto existe, **7** si no, para que uno recién cargado en OFF aparezca sin esperar un mes.

La sugerencia (`PantryBarcodeSuggestion`) trae `name` (nombre + marca + tamaño, sin repetir lo que el nombre ya dice y dentro de los 120 caracteres), `brand`, `packageSize`, `category` (o `null` si no se pudo deducir), `unit: 'PACKAGES'` y `sourceUrl` con la ficha del producto en OFF. La licencia de los datos (ODbL) exige atribución: el cliente tiene que mostrar ese link junto a los datos precargados.

### Escaneo

`scanProduct` corre con `withHousehold`, así que dos escaneos simultáneos del mismo código en un hogar nunca crean dos productos.

| Situación                                                    | Resultado                                                                                                  |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| El código ya está vinculado                                  | `INCREMENTED`: suma `quantity` (default 1). Los datos del formulario se ignoran.                           |
| No está y el body trae `product` con un nombre que no existe | `CREATED`: alta con el código. La cantidad es `quantity`, no la del formulario.                            |
| No está y ya hay un producto con ese nombre, sin código      | `LINKED`: suma y le vincula el código. No cambia categoría, unidad ni vencimiento.                         |
| No está y el producto con ese nombre ya tiene otro código    | `INCREMENTED`: solo suma; el código escaneado no se vincula y la próxima vez vuelve a pedir el formulario. |
| No está y el body no trae `product`                          | 404: se desvinculó o se borró después de la consulta. El cliente vuelve a consultar.                       |

El stock nunca baja de cero ni pasa `AMOUNT_MAX_10_2` (`applyStockDelta`). `quantity` y `delta` admiten hasta dos decimales, que es lo que guarda la columna: con más responden 400.

### Deshacer

El `outcome` del escaneo dice cómo se deshace:

| `outcome`     | Cómo se deshace                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| `INCREMENTED` | `POST …/stock` con `delta: -quantity`.                                                                         |
| `LINKED`      | `POST …/stock` con `delta: -quantity` y `PATCH` con `barcode: null`.                                           |
| `CREATED`     | `DELETE /api/pantry/products/:productId`. Restar el stock dejaría un producto en cero con el código vinculado. |

## Open Food Facts

`open-food-facts.service.ts` hace la consulta y `open-food-facts.parser.ts` traduce la respuesta, sin red ni base.

- **Request:** `GET {OPEN_FOOD_FACTS_BASE_URL}/product/{código}.json` con solo los campos que se usan, `User-Agent` propio (lo exige su política) y 5 s de tope.
- **Cupo:** OFF permite 15 lecturas de producto por minuto por IP. La API se limita a 10 con una ventana en memoria, y una misma persona puede usar hasta 8 de esas 10 para no dejar sin catálogo al resto; sin cupo responde 503 sin salir a la red. Solo gastan cupo los códigos que no están en la alacena ni en el caché.
- **No encontrado:** `status: 0` en el body (OFF lo manda con un 404) o un producto sin nombre. Un 404 sin `status: 0` es una falla, no un "no encontrado": puede ser una URL mal configurada o un cambio de ruta.
- **Fallas:** 503 (sin cupo o 429 del proveedor), 504 (no contestó a tiempo), 502 (cualquier otro error o un body inesperado). Una falla **no se guarda** como "no encontrado". Si había una fila vencida con el producto se sigue sirviendo y su vencimiento se corre una hora, para no esperar el tope de tiempo ni gastar cupo en cada consulta mientras OFF siga caído; si no, el error llega al cliente, que ofrece la carga a mano.
- **Categoría:** primero por `categories_tags`, en el orden de `CATEGORY_RULES` (un helado es congelado antes que lácteo; el dulce de leche no cuenta como lácteo). Si ninguna etiqueta alcanza, por palabras del nombre: gana la que aparece primero y no cuentan las que vienen después de una preposición ("Galletitas de agua" es snack, "Atún al agua" queda sin categoría).
- **Tamaño:** `quantity` es texto libre de la comunidad; se normaliza a `500 g` / `1,5 L` y se omite ante un multipack (`6 x 250 ml`, `250 ml x 6`) o una unidad que no es de peso ni volumen.

El cupo y el single-flight de consultas simultáneas al mismo código viven en memoria y valen por proceso. Una consulta que falla (timeout, 5xx) igual gasta cupo, a propósito: pudo haber llegado a OFF y contar para su límite. Con más de una instancia de la API el cupo real contra OFF se multiplica por la cantidad de instancias: habría que moverlo a un almacén compartido. El caché ya es compartido porque está en la base.

## Cliente mobile (#260)

"Escanear código" en el inventario abre `ScanSheet` (`apps/mobile/src/features/pantry/components`), una `FormSheet` con la cámara de `expo-camera`:

| Estado                    | Qué ve la persona                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permiso sin pedir         | Para qué se usa la cámara y "Permitir cámara". Bloqueado sin poder volver a preguntar: "Abrir Ajustes" (el permiso se vuelve a leer al volver a la app). Siempre "Cargar a mano".              |
| Cámara                    | Marco, linterna y "Cargar a mano". Las lecturas con dígito verificador inválido se ignoran.                                                                                                    |
| Buscando                  | "Buscando …" arriba de la cámara, que sigue montada pero no lee.                                                                                                                               |
| Código interno            | `Banner` warning sin salir a la red; la cámara sigue abierta y el "Deshacer" pendiente no se pierde.                                                                                           |
| Ya en la alacena          | Suma 1 al instante, `Banner` "Sumamos 1 paquete a …" y "Deshacer"; la cámara sigue abierta.                                                                                                    |
| Encontrado en OFF         | Alta precargada (nombre, categoría si se dedujo, unidad, cantidad 1) que se puede guardar sin tocar nada, "Ver en Open Food Facts" y la atribución de la licencia.                             |
| No encontrado             | Alta con cantidad 1 y el código, que queda guardado para la próxima. "Agregar producto" se habilita al escribir.                                                                               |
| Error de la consulta      | `ErrorState` con "Reintentar", "Cargar a mano" (el código se conserva) y "Volver a escanear"; nunca como "no encontrado".                                                                      |
| Escaneo sin saber si sumó | Error de red, timeout o 504 en el `POST …/scan`: la API pudo haber sumado, así que solo "Volver a escanear" y el aviso de revisar el inventario. Reintentar o cargar a mano sumarían otra vez. |

El cliente normaliza el UPC-A con `normalizeBarcode` y escanea primero: un código vinculado suma con un solo request, y recién con el 404 consulta (y gasta cupo de OFF). Si la consulta responde `IN_PANTRY` (lo vincularon en el medio) vuelve a escanear una vez, y si ese escaneo da 404 (lo desvincularon otra vez) abre el alta.

El mismo código que sigue a la vista no suma dos veces (`scanGate`: hay que sacarlo de cuadro unos 2 s). La cámara no se desmonta mientras se resuelve un código; después del alta sí, y al quedar lista (`onCameraReady`) corre la ventana, porque mientras estuvo apagada no hubo lecturas y el producto que quedó en cuadro se sumaría otra vez.

"Deshacer" se ofrece una sola vez: si falla no se repite, porque una resta que llegó a la API con la respuesta perdida restaría dos veces. Si se deshace una vinculación y la resta sale pero falla soltar el código, el aviso lo dice y manda a quitarlo desde el detalle. El detalle del producto muestra el código vinculado con "Quitar código" (`PATCH` con `barcode: null`).

Al cerrar la hoja la cámara deja de leer enseguida (no espera la animación de salida). Una consulta en curso no bloquea el cierre: si el escaneo termina con la hoja cerrada, el resultado sale en un toast.

## Hogar

Al unir dos hogares un producto está repetido si coincide el nombre normalizado **o** el código de barras; queda el del hogar que recibe y el código del descartado no se traslada. Al desvincularse, la copia conserva los códigos. Detalle en [household.md](./household.md).

## Tests

- Unitarios: `open-food-facts.parser.test.ts`, `open-food-facts.service.test.ts` (con `fetch` stubbeado) y `barcode.service.test.ts` (single-flight).
- Integración: `pantry-barcode.integration.test.ts` mockea `open-food-facts.service` y corre contra Postgres real; `household.integration.test.ts` cubre la unión y la desvinculación con códigos.

Cada test de integración corre en una transacción que se revierte, y `prisma.$transaction` se aplana sobre ella: la suite no puede reproducir dos escaneos realmente simultáneos. Eso se prueba contra una API levantada.
