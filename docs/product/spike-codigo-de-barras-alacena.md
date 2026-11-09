# Spike: código de barras en Alacena (mobile)

Investigación y diseño, sin código de producción. Relevado el 2026-11-08.

## Decisión

| Tema                 | Decisión                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Proveedor principal  | **Open Food Facts** (OFF), consultado desde la API de Omni y con caché en Postgres.                                           |
| Fallback             | **Sin segundo proveedor.** Alta a mano con el código precargado; el hogar lo reconoce la próxima vez.                         |
| Escaneo              | `CameraView` de `expo-camera` (`~17.0.10`, la versión de Expo 54), con `ean13` y `ean8`.                                      |
| Código ya en alacena | Suma 1 al instante, confirma con **Deshacer** y la cámara sigue abierta.                                                      |
| Vencimiento al sumar | Se conserva la fecha que ya tenía el producto: es la más próxima y no se pide otra al escanear.                               |
| Prioridad            | p2, bajo el epic [#48](https://github.com/Leancoggiola/omni/issues/48).                                                       |
| Pendiente            | Probar el escaneo en un Android físico: este spike validó el paquete y sus tipos, no una lectura real con cámara (ver abajo). |

## Cobertura de Open Food Facts

### Método

- **Muestra:** 137 EAN-13 con prefijo 779 y dígito verificador válido, de lácteos, fideos, arroz, harina, yerba, galletitas, alfajores, gaseosas, jugos, aceites, mayonesa, tomate y limpieza.
- **De dónde salieron los códigos:** de una lectura única del catálogo público de Carrefour, para tener una muestra que no dependa de OFF. Se tomaron los más vendidos de cada búsqueda (83) y productos de más abajo en el ranking (54). El catálogo se usó solo para armar la muestra, nunca como fuente de datos del producto.
- **Consulta:** `GET /api/v2/product/{ean}.json` a 12 consultas por minuto.
- **"Usable" significa:** nombre de al menos 3 letras; marca no vacía; cantidad con número y unidad interpretable; y categoría que mapea a `PantryCategory` por tags de OFF o, si no hay tags, por palabras del nombre.
- **Límites de la muestra:** una sola cadena, no es aleatoria y el rubro se infiere del término de búsqueda (algunas búsquedas trajeron otros productos, por ejemplo atún en "aceite"). Marca propia de Carrefour: 15 de 137.

### Resultados

| Segmento                | n   | Encontrado | Nombre | Marca | Cantidad | Categoría | Nombre + categoría | Completo |
| ----------------------- | --- | ---------- | ------ | ----- | -------- | --------- | ------------------ | -------- |
| **Toda la muestra**     | 137 | 71%        | 68%    | 66%   | 51%      | 58%       | 57%                | 44%      |
| **Alimentos y bebidas** | 113 | 85%        | 81%    | 80%   | 62%      | 69%       | 68%                | 53%      |
| Alimentos, sin propia   | 100 | 89%        | 86%    | 84%   | 67%      | 72%       | 71%                | 57%      |
| Alimentos, más vendidos | 68  | 91%        | 88%    | 87%   | 69%      | 76%       | 76%                | 62%      |
| Alimentos, resto        | 45  | 76%        | 71%    | 69%   | 51%      | 58%       | 56%                | 40%      |
| Lácteos                 | 31  | 87%        | 84%    | 87%   | 81%      | 77%       | 77%                | 74%      |
| Condimentos y aceites   | 24  | 83%        | 83%    | 79%   | 54%      | 79%       | 79%                | 50%      |
| Granos y fideos         | 24  | 79%        | 79%    | 75%   | 50%      | 71%       | 71%                | 50%      |
| Bebidas y yerba         | 20  | 80%        | 75%    | 70%   | 65%      | 40%       | 40%                | 30%      |
| Galletitas y alfajores  | 14  | 100%       | 86%    | 86%   | 50%      | 71%       | 64%                | 50%      |
| **Limpieza**            | 24  | 4%         | 4%     | 0%    | 0%       | 4%        | 4%                 | 0%       |

Conclusiones:

- En alimentos alcanza para precargar el nombre en 4 de cada 5 códigos. En limpieza no sirve: OFF es una base de alimentos.
- **La confirmación es obligatoria.** Los nombres son correctos pero irregulares ("seven free", "Manteca", "Casamcrem") y 1 de 93 era directamente otro producto (un arroz figura como queso rayado). Nada que venga de OFF se guarda sin pasar por una pantalla editable.
- **Categoría.** Revisados a mano los 8 desvíos entre mapeo y rubro esperado, 77 de 79 son correctos: 6 eran ruido de la búsqueda. Quedan un error del mapeo y uno del dato de origen.
- **Latencia desde la máquina de desarrollo:** p50 de 743 ms y p95 de 952 ms. No está medida desde Render.

### Alternativas

Sobre los 40 códigos que OFF no encontró y los 24 de limpieza (41 distintos):

| Proveedor                  | Aciertos   | Límites y costo                                                         | Términos                                                                      | Veredicto                                            |
| -------------------------- | ---------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| Open Products Facts        | 2 de 41    | Misma infraestructura que OFF                                           | ODbL                                                                          | No justifica una segunda consulta; datos muy pobres. |
| Open Beauty Facts          | 1 de 41    | Misma infraestructura que OFF                                           | ODbL                                                                          | Fuera de rubro.                                      |
| UPCitemdb (gratis)         | 0 de 41    | 100 consultas por día, 6 por minuto, sin registro; DEV US$ 99 por mes   | Licencia "solely for Customer's operations"; no se halló cláusula sobre caché | Descartado: no cubre Argentina en esta muestra.      |
| Go-UPC                     | Sin probar | Sin plan gratis, clave de prueba a pedido; desde US$ 74,95 por mes      | Prohíbe revender o hacer públicos los datos                                   | Descartado por costo fijo sin cobertura comprobada.  |
| Barcode Lookup             | Sin probar | La página de la API responde 403 a clientes automáticos                 | No se pudieron leer                                                           | Descartado: sin condiciones verificables.            |
| Catálogos de supermercados | No aplica  | Endpoints internos, sin contrato, pueden cambiar o bloquearse sin aviso | Sin licencia de reutilización                                                 | Descartado como fuente.                              |

### Condiciones de Open Food Facts

- **Límite: 15 lecturas por minuto y por IP** según su [documentación](https://openfoodfacts.github.io/openfoodfacts-server/api/), con 503 ante picos globales. Algunas fuentes viejas citan 100 por minuto: vale la documentación oficial, y la historia debe respetar 15.
- **`User-Agent` propio** con forma `AppName/Version (contacto)`.
- **Licencia:** base en ODbL, imágenes en CC BY-SA. Pide [atribución con enlace](https://world.openfoodfacts.org/terms-of-use), así que la UI muestra "Datos de Open Food Facts".
- **Compartir igual:** si la base se combina con otra, la resultante queda alcanzada. Por eso la caché vive en su propia tabla y no se mezcla con otras fuentes ni con datos de los hogares. Si Omni llegara a ser comercial o pública, conviene revisar este punto con más detalle.
- **Escritura:** requiere autenticación. Aportar productos a OFF queda fuera de alcance.

## Escaneo en mobile

Validado leyendo `expo-camera@17.0.10` (tipos, config plugin, changelog) y el `bundledNativeModules.json` de Expo 54.

| Tema                   | Resultado                                                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Versión                | `expo install expo-camera` fija `~17.0.10`. Regla de versiones del repo: en mobile manda `expo install`.                                                                                      |
| `expo-barcode-scanner` | Deprecado por Expo. Estuvo en el bundle hasta SDK 51 (`~13.0.1`) y ya no figura en 52, 53 ni 54. No hay que instalarlo.                                                                       |
| Lectura                | `barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}` y `onBarcodeScanned`. Android usa ML Kit embebido (`barcode-scanning:17.3.0`); desde 17.0.8 funciona sin Google Play Services. |
| Permisos en el build   | El plugin agrega `CAMERA` y también `RECORD_AUDIO` salvo que se indique lo contrario: `["expo-camera", { "recordAudioAndroid": false }]` en `app.json`.                                       |
| Build                  | Módulo nativo: requiere `expo prebuild` y `expo run:android` para regenerar el dev client.                                                                                                    |
| Permiso denegado       | `useCameraPermissions()`. Con `canAskAgain` en falso ya no aparece el diálogo del sistema: se ofrece abrir Ajustes con `Linking.openSettings()` y siempre queda la carga a mano.              |
| Linterna               | Prop `enableTorch`, controlada con un botón sobre la vista de cámara.                                                                                                                         |
| Lecturas repetidas     | `onBarcodeScanned` se dispara por cuadro y ya no existe `interval`. Hay que deduplicar con un `useRef` (el estado llega tarde): bloqueo mientras se procesa y 2 s de espera por código.       |
| Salir de la pantalla   | `active` es **solo iOS**. En Android hay que desmontar `CameraView` al cerrar la hoja o perder foco; la documentación también pide una sola vista de cámara activa.                           |
| Validación local       | Antes de ir a la red: dígito verificador y prefijos internos (ver Contrato).                                                                                                                  |

**Sin verificar:** no se armó prototipo ni se leyó un código con una cámara real. Calidad de lectura, velocidad y comportamiento de la linterna se validan en la historia mobile, en un Android físico.

## Arquitectura

```text
Cámara → validación local → GET lookup (API Omni) → producto del hogar → caché → Open Food Facts
                                                  ↓
                            POST scan (suma, vincula o crea, con lock de hogar)
```

### Contrato en `@omni/shared/pantry`

```ts
export const pantryBarcodeSchema = z
  .string()
  .regex(/^(\d{8}|\d{13})$/)
  .refine(hasValidCheckDigit);

export type PantryBarcodeSuggestion = {
  name: string;
  brand: string | null;
  packageSize: string | null;
  category: PantryCategory | null;
  unit: PantryUnit;
  sourceUrl: string;
};

export type PantryBarcodeLookup =
  | { status: 'IN_PANTRY'; barcode: string; product: PantryProduct }
  | { status: 'FOUND'; barcode: string; suggestion: PantryBarcodeSuggestion }
  | { status: 'NOT_FOUND'; barcode: string };

export const scanPantryProductSchema = z.object({
  barcode: pantryBarcodeSchema,
  quantity: z.number().positive().max(AMOUNT_MAX_10_2).default(1),
  product: createPantryProductSchema.omit({ quantity: true }).optional(),
});

export type PantryScanResult = {
  outcome: 'CREATED' | 'INCREMENTED' | 'LINKED';
  product: PantryProduct;
};
```

| Endpoint (en `API_PATHS.pantry`)             | Hace                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/pantry/barcodes/:barcode`          | Resuelve en orden: producto del hogar, caché, OFF. Con límite por usuario, como `suggestLimiter`. Una falla de OFF da 502 o 504, igual que TMDB. |
| `POST /api/pantry/products/scan`             | Suma, vincula o crea dentro de `withHousehold`. `product` es obligatorio si el código no existe y no matchea por nombre.                         |
| `POST /api/pantry/products/:productId/stock` | Ajuste atómico `{ delta }` con piso en 0, para **Deshacer**. Un `PATCH quantity` pisaría un cambio de la pareja.                                 |

Códigos sin búsqueda posible: EAN-13 con prefijo `02x`, `04x` o `2xx` y EAN-8 que empieza con `0` o `2` son de uso interno (balanza, fruta y verdura). `isInternalBarcode` en shared los corta antes de la red y el cliente lleva a la carga a mano.

### Modelo

```prisma
model PantryProduct {
  barcode String?

  @@unique([householdId, barcode])
}

model BarcodeCatalogEntry {
  barcode     String          @id
  found       Boolean
  name        String?
  brand       String?
  packageSize String?
  category    PantryCategory?
  fetchedAt   DateTime
  expiresAt   DateTime

  @@index([expiresAt])
}
```

- El `@@unique` cubre el índice por hogar y admite varios productos sin código (Postgres no compara `NULL`).
- `BarcodeCatalogEntry` es global: guarda datos públicos del producto y nada del hogar. Vigencia: 30 días si se encontró y 7 si no. Los errores de OFF no se guardan.
- **Límite hacia OFF:** además de la caché, un limitador en proceso a 10 consultas por minuto, por debajo del tope por IP. Si se agota, responde 503 y el cliente ofrece la carga a mano. Render corre una sola instancia, así que alcanza con memoria.
- **Cold start:** la caché en Postgres sobrevive al sueño de Render. Entre las 2:00 y las 7:00, fuera del keep-alive que dejó [#176](https://github.com/Leancoggiola/omni/issues/176), el primer lookup puede tardar cerca de un minuto: lo cubre `fetchWithWake` con el aviso de API despertando.

### Reglas de negocio

1. **Código ya en la alacena:** `IN_PANTRY` suma 1 con `increment` atómico y no toca nombre, categoría ni vencimiento. Un producto con cantidad 0 se sigue reconociendo.
2. **Sin código pero mismo nombre normalizado:** `LINKED`. Le guarda el código y suma, en lugar del 409 de hoy. Si ese producto ya tenía otro código, suma sin reemplazarlo: un campo por producto es la limitación aceptada.
3. **Producto nuevo:** `CREATED`. `FOUND` abre la hoja con datos editables y `NOT_FOUND` abre el formulario con el código precargado. Desde ahí el hogar lo reconoce sin consultar a OFF.
4. **Borrar un producto** olvida su código. Se acepta para no sumar otra tabla.
5. **Corregir un vínculo:** `updatePantryProductSchema` acepta `barcode` nulo.

### Alacena compartida (#59, #223)

- El código es del hogar: un escaneo de cualquiera de los dos se reconoce para el otro. `updatedById` se escribe en cada suma.
- `withHousehold` toma el lock del hogar, así que dos escaneos simultáneos del mismo código nuevo no duplican.
- **Riesgo real en la unión de hogares:** `household.service.ts` deduplica solo por nombre. Con el `@@unique` nuevo, dos productos con el mismo código y distinto nombre romperían el `updateMany` y la unión fallaría. Hay que deduplicar también por código, con el mismo criterio de hoy (queda el registro del hogar que recibe). Va con test.
- Desvincular copia el código al hogar nuevo. No genera conflicto porque la unicidad es por hogar.

### Mapeo a `PantryCategory` y `PantryUnit`

Se evalúa en este orden y gana la primera regla: los productos traen tags de varias familias (un snack también es `en:cereals-and-potatoes`).

| Orden | `PantryCategory` | Tags de OFF                                                                                                       | Si no hay tags, por nombre               |
| ----- | ---------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1     | `FROZEN`         | `en:frozen-foods`                                                                                                 |                                          |
| 2     | `CLEANING`       | `en:cleaning-products`, `en:household-products`                                                                   | detergente, lavandina, jabón, suavizante |
| 3     | `DAIRY`          | `en:dairies`, `en:milks`, `en:yogurts`, `en:cheeses`, `en:butters`, `en:creams`                                   | leche, yogur, queso, manteca             |
| 4     | `MEAT`           | `en:meats`, `en:prepared-meats`, `en:fishes`, `en:seafood`                                                        |                                          |
| 5     | `BEVERAGES`      | `en:beverages`, `en:waters`, `en:sodas`, `en:juices`, `en:teas`, `en:coffees`                                     | yerba, gaseosa, jugo, agua, café, té     |
| 6     | `SNACKS`         | `en:snacks`, `en:sweet-snacks`, `en:salty-snacks`, `en:biscuits`, `en:chocolates`, `en:confectioneries`           | galletita, alfajor, chocolate            |
| 7     | `CONDIMENTS`     | `en:condiments`, `en:sauces`, `en:vegetable-oils`, `en:fats`, `en:salts`, `en:spices`, `en:vinegars`, `en:sugars` | aceite, mayonesa, mostaza, salsa, azúcar |
| 8     | `GRAINS`         | `en:cereals-and-potatoes`, `en:pastas`, `en:rices`, `en:flours`, `en:breads`, `en:breakfast-cereals`              | fideo, arroz, harina, polenta, avena     |
| 9     | `FRUIT`          | `en:fruits`, `en:canned-fruits`                                                                                   |                                          |
| 10    | `VEGETABLE`      | `en:vegetables`, `en:canned-vegetables`, `en:legumes`, `en:vegetable-based-foods`                                 |                                          |

- Sin coincidencia, `category` va en `null` y el formulario la pide, como hoy. El mapeo por nombre debe excluir "dulce de leche": fue el único error del mapeo en la muestra.
- **Unidad:** `PantryUnit` solo tiene `UNITS` y `PACKAGES`, cuenta envases y no gramos o litros. Todo producto escaneado propone `PACKAGES` y se puede cambiar.
- **Tamaño:** como no hay unidad de peso o volumen, va en el nombre: `Leche La Serenísima 1 L`. Se compone con nombre, marca y tamaño sin repetir lo que ya está, con tope de 120 caracteres. Así la botella de 1 L y la de 500 ml no chocan en `nameNormalized`.
- OFF trae la cantidad muy variada (`g`, `gr`, `kg`, `l`, `lts`, `litro`, `ml`, `g(oz)`, un número suelto). El parser debe tolerarlo y, si no entiende, omitir el tamaño.

## Diseño

El canvas indicado para este spike (`WFjcPzKkX5L65Ew6QEZkNj`) resultó ser **Omni · Inicio** y no tiene Alacena. El que corresponde es [Omni · Alacena](https://claude.ai/artifact/NoEeE4KGtSwqRmesPaqweZ), enlazado en #48. Su exploración `Expl-escaneo` es una propuesta de una sola hoja con cámara, producto y dos botones: sirve de punto de partida y faltan los estados. Regla del epic: canvas aprobado antes de escribir la pantalla, en claro y oscuro.

| Pantalla o estado        | Contenido                                                                  | Componentes y tokens                                                  |
| ------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Entrada                  | Acción "Escanear" en Alacena, junto al alta manual                         | `Button` o `IconButton`, `primary`                                    |
| Hoja de escaneo          | Cámara, marco de lectura, linterna, "Cargar a mano", atribución            | `FormSheet`, `surfaces-overlay` sobre la cámara, marco en `primary`   |
| Permiso pendiente        | Explica para qué se usa la cámara antes del diálogo del sistema            | `EmptyState`, `Button`                                                |
| Permiso denegado         | "Abrir Ajustes" y "Cargar a mano"                                          | `EmptyState`, `surfaces-warning-light`, `icons-warning`               |
| Buscando                 | Código leído mientras responde la API, con aviso si está despertando       | `LoadingState`                                                        |
| Producto encontrado      | Nombre, categoría y unidad editables, cantidad, "Datos de Open Food Facts" | `FormSheet` reutilizando `ProductFormSheet`, `Banner` `info`          |
| Ya en la alacena         | "Sumamos 1 a Leche entera", **Deshacer**, cámara sigue activa              | `Banner` dentro de la hoja, `surfaces-success-light`, `icons-success` |
| No encontrado            | Formulario con código precargado y mensaje claro                           | `ProductFormSheet`, `Banner` `info`                                   |
| Código interno o balanza | Explica que ese código no se puede buscar y ofrece carga a mano            | `Banner` `warning`                                                    |
| Error de red o de OFF    | Reintentar y "Cargar a mano"; nunca se muestra como no encontrado          | `ErrorState`, `surfaces-error-light`                                  |

Restricción técnica que condiciona el diseño: `FormSheet` vive en un `Modal` de RN que **tapa los toasts**, así que la confirmación y **Deshacer** tienen que ir dentro de la hoja (`Banner`), no en `notify*`. Nada de hex ni verdes de Mantine: solo alias semánticos de `packages/shared/src/theme/tokens.ts`.

## Fuera de alcance

- Web (no tiene cámara como caso de uso), lectura de vencimientos por OCR y aportar productos a OFF.
- Varios códigos por producto y `upc_a` (importados de EE. UU.): se suman si aparece la necesidad.
- Proveedor pago.
