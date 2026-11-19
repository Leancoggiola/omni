---
name: canvas-modulo
description: Crear, revisar o completar el canvas de diseño de un módulo de Omni (artifact tipo Design, "Omni · <módulo>") sobre el Design System, con todos los flujos de web y mobile contra la API. Usar al pedir el canvas de un módulo nuevo, al auditar o cerrar huecos de uno existente, al revisar un diseño contra el Design System, o cuando un modelo de código pregunta por flujos que el canvas no define (confirmaciones, estados, errores, navegación, solo lectura).
---

# Canvas de un módulo de Omni: crear, revisar y completar

> **Documento vivo:** si una corrida descubre un patrón, una trampa o un paso que no está acá, actualizar esta skill antes de darla por terminada.

Dos modos, mismo proceso:

- **Crear**: el módulo no tiene canvas. La matriz de cobertura (paso 2) arranca vacía y todo el inventario de boards se dibuja desde cero.
- **Completar o revisar**: el canvas existe. La matriz marca qué flujos están, cuáles faltan y cuáles contradicen la API o el Design System.

Entrada mínima: el módulo y, si ya existe, la URL del canvas (`https://claude.ai/artifact/<id>`). Opcional: issues (web, mobile, epic), documento de producto (`docs/product/`) y dudas abiertas de los modelos de código. Un canvas existente se publica **siempre sobre la misma URL**.

Regla de oro: no asumir. Lo que está en el código se lee; lo que no está se decide, se marca como suposición y se le pregunta a Leandro. Separar siempre **verificado** de **inferido**.

## Referencias

Design System (artifact tipo Design System, fuente de verdad visual): https://claude.ai/artifact/LVyYp2tYiGaebDzsMpagj4. Canvas de referencia para patrones: Alacena (`NoEeE4KGtSwqRmesPaqweZ`), División de gastos (`T15fsZDQX4aasss1MLLUjF`) y Gimnasio (`TBh86u8BzX9SGdZBmTX6i5`, el más completo en flujos y estados). Otros: Media, Perfil y Más, Login, Inicio, Administración, Notificaciones. Para ver los vigentes: `Artifact` con `action: "list"`.

## Paso 0. Preparación

1. Cargar la skill `artifact-design`.
2. **Modo crear**: primera llamada `Artifact` con `action: "quickstart"` (intención de diseño) y, con el tipo Design, crear el canvas con `type_url`, `title` = "Omni · <Módulo>" y `auto_open: "after_first_write"`; después, nunca otro `type_url`. Instalar el Design System: `files` con `"project/ds/omni/tokens.json": {"artifact": "<URL del DS>", "path": "project/tokens.json"}` y, en `canvas.json`, `designSystems` con `{"title", "namespace": "omni", "artifact", "version": null, "copiedAt"}`. Si `project/ds/omni/tokens.json` ya existe en el canvas (por ejemplo, al repetir el copiado), la publicación lo trata como un archivo que no se leyó: pasar `overwrite_unread: ["project/ds/omni/tokens.json"]`. Copiar al canvas `omni-theme.css`, `logo.png` y crear `project/<modulo>.css` con las clases propias (prefijo de dos letras, p. ej. `gy-*`, `al-*`).
3. **Modo completar**: leer el artifact (`read` e índice, `list` con `scope: "files"`), `project/canvas.json` y el `.dc.html` completo de cada board que se vaya a tocar.
4. Contrato del tipo Design: `canvas.json` v3 (`boards`, `order`, `pages`, `notes`, `launch`), un `project/<Nombre>.dc.html` por board (el primero `Main.dc.html`), root + `file_path` al publicar, cada board nuevo con su wrapper `-oscuro` (importa el base con `tema="dark"`), links entre boards con `is_interactive: true`, solo `var(--token)` en estilos propios, sin emoji, copy rioplatense y datos de ejemplo (Ana Gómez, ana@ejemplo.com; nada real).
5. Leer `project/README.md` y `project/tokens.json` del Design System (Artifact `read` con `paths`) y copiar sus patrones: `om-navbar`, `om-header`, `om-card`, `om-segmented`, `om-banner`, `om-sheet`, `om-state`, `om-skel`, `om-fab`, `om-toast`, `om-tabbar`.

Reglas de diseño confirmadas por Leandro (valen para todos los canvas):

- **Server-wake**: es un banner `info` arriba de la pantalla (no un estado a pantalla completa ni un toast).
- **Datos de ejemplo**: siempre Ana Gómez (ana@ejemplo.com); nunca datos reales.
- **Widgets**: también usan el tema (tokens claro/oscuro), no colores propios.

## Paso 1. Fuentes de verdad (solo lectura)

La rama local `develop` puede estar atrasada. Leer la API **desde `origin/develop`**: `git show origin/develop:<ruta>` (sin fetch ni cambios en el repo).

- `docs/api/<modulo>.md`, `packages/shared/src/<modulo>/` (schemas, constantes, tipos) y `apps/api/src/<modulo>/*.routes.ts` y `*.service.ts`: mensajes exactos de `HttpError`, reglas de 409/404, cascadas, idempotencia, límites.
- `packages/shared/src/api/paths.ts` (rutas), `errors.ts` (`getErrorMessage`, `isClientError`) y `server-wake` (textos globales).
- `packages/shared/src/navigation/registry.ts` (`availableOn`, tabs, "Más") y `apps/mobile/src/features/more/`.
- Patrones de UI de otros módulos: `confirm`, `actionSheet`, `notifySuccess`, `notifyError`, `ErrorState`, `EmptyState`, `LoadingState` (`@/shared/ui`, web y mobile). Dibujar lo que el componente real hace, no lo que se imagina: en mobile `confirm()` es una hoja inferior (título display, texto, confirmar filled arriba y Cancelar outline abajo; el board Borrar de Alacena lo muestra) y `actionSheet()` es una hoja con título, opciones de ícono y label, sin subtítulos ni opción destructiva (`apps/mobile/src/shared/ui/confirm`, `actionSheet`). En web, `confirm` es un modal centrado (alertdialog).
- `docs/design-system.md` y los `CLAUDE.md` de las apps.
- Si el módulo todavía no tiene API (crear): el documento de producto, los issues y el contrato en `packages/shared`. Lo que no esté definido es suposición y se pregunta.

## Paso 2. Matriz de cobertura

Armar una tabla **flujo × plataforma × tema**. Revisar como mínimo:

1. Alta, edición, renombrado, archivado/desarchivado y borrado: dónde vive cada acción y adónde se navega después.
2. Confirmaciones destructivas: texto exacto con la cascada real (qué se borra de más); alertdialog en web, `confirm` en mobile (la hoja se cierra antes).
3. Formularios: campos, límites del contrato, validación y copy de cada error, estado deshabilitado, datos sin guardar.
4. Reglas de la API que la UI debe respetar: solo lectura (409), duplicados, destinos inválidos, listas desactualizadas, idempotencia.
5. Listas: cargando, vacío, sin resultados, error con reintentar, paginación ("Ver más") y estados parciales.
6. Transversales: 404, 409, red, timeout, server-wake, avisos de éxito y el texto de cada acción.
7. Navegación: entrada, ítem por defecto, rutas, tabs vs "Más", barra lateral web, `availableOn` (un módulo nuevo figura como "Pronto" hasta que el PR lo habilite).
8. Paridad web/mobile (misma acción, mismo lugar, mismo texto) y claro/oscuro de cada board.
9. Accesibilidad: botones reales (`<a>` o `<button>`), `aria-label` en íconos, foco, contraste AA, zonas táctiles ≥ 44 px.
10. Qué falta para que un modelo de código no tenga que preguntar: textos exactos, singulares, formatos (fechas dd/mm, montos), orden.

Cada hueco queda en uno de dos estados: **[V]** verificado en código o **[S]** decisión de diseño a confirmar.

## Paso 3. Advisor (checkpoints)

Si el pedido lo indica (o el alcance es grande), trabajar con un subagente Opus de solo lectura (`Agent`, `model: "opus"`, `subagent_type: "general-purpose"`). Siempre con un resumen **autocontenido** (objetivo, lo verificado, borrador, alternativas), sin secretos ni datos personales. Puntos de control:

1. Tras leer canvas, DS y API, antes de dibujar: plan de flujos y boards.
2. Al cerrar cada grupo de flujos: huecos y contradicciones con el DS y entre web y mobile.
3. Antes de publicar: lista de decisiones y suposiciones, más las capturas (el advisor abre PNG con `Read`).

El DS, los `CLAUDE.md` y lo que pidió Leandro mandan sobre el advisor. Decirle a Leandro qué consultaste y qué hiciste con la respuesta.

## Paso 4. Construir con un generador (no a mano)

Con decenas de boards, generar los archivos con un script en el scratchpad (nunca dentro del repo) a partir de parciales: el board base y su wrapper `-oscuro` salen de la misma plantilla, así nunca se desfasan. Referencias en `scripts/`: `ejemplo-lib.mjs` (parciales `boardFile`, `darkWrapper`, banners, hojas, menús, modales, toasts) y `ejemplo-build.mjs` (posiciones, páginas, notas, `canvas.json`).

Convenciones de layout:

- Filas: claro arriba, oscuro abajo (`y_oscuro = y + alto + 360`); 80 px entre boards; título de fila (`kind: "title1"`) en `y - 240` con `maxW` = ancho de la fila; mobile 390×844, web 1440×980 (más alto si el contenido pasa de 980: medir `scrollHeight`).
- Páginas Mobile, Web y Estados; más páginas con título claro para flujos largos. Máximo ~6 boards mobile y ~4 web por fila.
- Notas de decisión (sticky, `w: 380`, ≤ ~900 caracteres) a la derecha de la fila de cada flujo, apiladas cada 620 px. Ids de notas y páginas: `[A-Za-z0-9_-]{1,40}`.
- Conectar los boards con `href="Nombre{{sfx}}.dc.html"`.
- Modo completar: si se modifica un board existente, dejar una nota "Cambios en esta página". No pisar en silencio algo que los modelos de código ya vieron. Reutilizar los datos de ejemplo del canvas para que los fondos de hojas y menús coincidan.
- Modo crear: primero el camino feliz (web y mobile), después los estados (cargando, vacío, error), después los flujos secundarios; el módulo entra en la barra lateral y en "Más" como en los otros canvas.

Trampas conocidas:

- Un hook de Prettier reformatea los `.mjs` del scratchpad: leer antes de editar con `Edit`, o editar con un script.
- En zsh `$VAR` no se divide en palabras: lanzar listas de boards con un script `bash`.
- Una clase del módulo puede chocar con otra existente (`.gy-hist > div` pisaba filas nuevas): usar un prefijo propio.
- `.om-badge` va en mayúsculas: para valores con unidad (`60 kg`) usar una clase propia en minúscula.
- El título (`strong`) de un banner de color no llega a AA sobre su fondo (ver paso 5): fijarlo en `var(--text)`.
- Los banners de error muestran el mensaje de la API tal cual en negrita y una línea fija de ayuda debajo.
- Los `{{...}}` solo admiten lookups (`tema`, `sfx`): nada de expresiones. Un link con otro hueco (`{{volver}}{{sfx}}.dc.html`) es válido y el lint lo omite porque no puede resolverlo.
- Un board que importa el mismo board con `tema="light"` y con `tema="dark"` (p. ej. Media `Compartida-web`) lleva ya su par claro/oscuro: no necesita wrapper `-oscuro`.
- **Subir un asset crea una versión nueva** del artifact. Antes de publicar, hacer un `read` simple de la URL (sin `path`) para que la publicación parta de esa versión; si no, se rechaza por versión desactualizada.
- Los `om-*` son del Design System: una clase `om-*` definida solo en el CSS del módulo o en un `<style>` inline (Inicio tiene `om-hl-*`) funciona, pero el lint la avisa. Preferir el prefijo del módulo.

## Paso 5. Revisar contra el Design System

El Design System es un artifact tipo Design System: `tokens.json` (colores por tema con su nota de uso, tipografía, espaciado, radios), `README.md` (voz y fundamentos), `components/<Comp>/README.md` + `preview.html` y un checklist propio (contraste AA en **todos** los temas, una nota de uso por token, sin "AI tropes"). Se usa en dos direcciones.

**5a. El canvas contra el DS** (automático y manual):

1. Correr `node .claude/skills/canvas-modulo/scripts/lint-canvas.mjs <carpeta project/> --module <modulo>.css` desde la raíz del repo. `--theme` (por defecto `omni-theme.css`) y `--module` se resuelven contra la carpeta `project/` indicada; también aceptan rutas absolutas (útil si el CSS está en otro lado, p. ej. el scratchpad). Verifica: índice, pares claro/oscuro, links entre boards, clases `om-*` y del módulo sin definir, `var(--token)` sin definir, colores sueltos, emoji, botones de ícono sin `aria-label`, `role="button"` en div/span, huecos `{{...}}` con expresiones y el contraste AA de los pares de texto del theme en claro y oscuro. Las clases y variables definidas son las del theme, las del módulo **y las del `<style>` dentro de `<helmet>` de cada board**. Un `om-*` que no está en el theme es un aviso. Los errores se corrigen; los avisos se evalúan.
2. Revisión manual contra el README del DS: voz (vos, frases cortas, sin exclamaciones, mayúscula solo al inicio, botones con verbo), un solo primario, acento escaso, `success` = terminado, múltiplos de 4, controles 36/44/48, botones mobile apilados y web a la derecha, estados obligatorios (carga, vacío, error), claro y oscuro de todo.
3. Si se retocan tokens o clases: `omni-theme.css` y `tokens.json` del canvas se copian del DS, nunca se editan a mano en el canvas. Ojo: Gimnasio carga `omni-theme.css` y `gym.css` como archivos de `project/`; los canvas anteriores (Alacena, Media, Perfil y Más, etc.) los cargan como uploads (`<link href="/_blob/<id>">`) **en todos los boards, wrappers `-oscuro` incluidos**, así que un cambio de tokens necesita subir el CSS de nuevo (nuevo `/_blob/<id>`) y repuntar **todos** los boards, también los wrappers. Antes de copiar un patrón de un canvas, abrir uno de sus boards y comprobar cómo carga los estilos.

**5b. El DS contra lo que aprendió el canvas** (hacia arriba, con permiso):

1. Los patrones nuevos que se repitan en dos o más módulos son candidatos a componente: hoja de acciones, confirm/alertdialog, menú desplegable, badge de valor con unidad, stepper, fila de historial, apilado de toasts. Listarlos con el board que los muestra.
2. Los problemas del propio DS se informan, no se corrigen en el canvas: p. ej. `--destructive` sobre `--destructive-surface`, `--info` sobre `--info-surface` y `--warning` sobre `--warning-surface` no llegan a 4,5:1 en claro (el lint lo mide).
3. Para proponer un componente al DS se usa el procedimiento del tipo (revisar un sistema): leer su índice y los archivos, `components/<Comp>/README.md` (la primera frase es el resumen) y `components/<Comp>/preview.html` (línea 1 `<!-- @dsCard group="…" height=N -->`), actualizar `bundle.css`, un solo publish con el índice al final y `lastChange`. **El DS es compartido: pedir confirmación a Leandro antes de escribirlo.**
4. Deriva con el código: comparar los colores de `packages/shared/src/theme/tokens.ts` (`git show origin/develop:…`) contra `tokens.json` del DS y avisar las diferencias. Re-sincronizar el DS desde el repositorio es el flujo "from code" del propio tipo (no corre solo ni toca el repo).
5. `/design-sync` y la herramienta `DesignSync` sincronizan proyectos de claude.ai/design, no este artifact: no se usan para el Design System de Omni.

## Paso 6. Verificar visualmente (obligatorio)

El visor de claude.ai no tiene sesión desde la terminal: se verifica en local.

1. Copiar `artifact-type/dc-runtime.js` (Artifact `read` con `path`) como `project/support.js` junto a los boards, **solo en local, nunca publicarlo**; traer también `logo.png`, `omni-theme.css` y el CSS del módulo.
2. Servir la carpeta con un servidor estático de Node en `127.0.0.1` y capturar con Playwright de `apps/e2e` a 1440×980 (web) y 390×844 (mobile): `node .claude/skills/canvas-modulo/scripts/shoot.mjs <root> <out> <w>x<h> <boards...>` desde la raíz del repo y con bash. Cierra el servidor al terminar.
3. Revisar con `scripts/montage.mjs` (hojas de contactos) los boards nuevos en claro y en oscuro: texto cortado, solapes, contraste, jerarquía, banners duplicados y `scroll` mayor al alto del board.
4. Sin errores de consola (se ignora el `{{n.d}}` del navbar, que ya estaba).

## Paso 7. Publicar

- Si antes se subió algún asset (CSS del tema como upload, imagen), esa subida creó una versión nueva: hacer un `read` simple de la URL del artifact antes de publicar.
- `Artifact publish` con `url`, `root` (carpeta que contiene `project/`), `file_path` = `canvas.json` y `files` = mapa `"project/X": "project/X"` de **todo** lo escrito (boards, wrappers, CSS, boards modificados). Hasta 255 archivos por llamada. No incluir `support.js` ni archivos de prueba. Si el canvas ya tiene `project/ds/omni/tokens.json` y se vuelve a copiar desde el DS, agregar `overwrite_unread` con esa ruta.
- Enviar el índice solo si cambia el layout, las páginas o las notas. Si alguien guardó mientras tanto, releer lo que indique el rechazo y rehacer la edición.

## Paso 8. Entrega

1. Lista flujo por flujo, redactada para pegarla a los modelos de código: decisión + board que la muestra, con **[V]** y **[S]**.
2. Qué se consultó al advisor y qué se hizo con la respuesta.
3. Qué se verificó (renders locales, links, consola, lint contra el DS) y qué no (por ejemplo, el visor real).
4. Hallazgos para el DS (paso 5b), aparte.
5. Preguntar **todas** las suposiciones a Leandro con `AskUserQuestion` (hasta 4 por llamada, la recomendada primero) y, con sus respuestas, reemplazar los "A CONFIRMAR" de las notas por "Confirmado por Leandro" y republicar el índice.

## Plantillas de pedido

Módulo nuevo:

> Creá el canvas «Omni · <módulo>» sobre el Design System (<URL del DS>) con la skill `canvas-modulo`, modo crear. Fuentes: <documento de producto o issues>, contrato en `packages/shared/src/<modulo>/` y API en `origin/develop`. Web y mobile, claro y oscuro, camino feliz, estados y todos los flujos secundarios, con las decisiones en notas. No toques el repo ni abras PRs. Consultá al advisor (Opus) tras el plan, al cerrar cada grupo y antes de publicar. Al final: lista flujo por flujo (decisión + board) con lo verificado y lo supuesto, hallazgos para el Design System, y preguntame todas las suposiciones.

Canvas existente:

> Revisá y completá el canvas «Omni · <módulo>» (<URL>) con la skill `canvas-modulo`, modo completar, contra el Design System (<URL del DS>) y la API (`docs/api/<modulo>.md`, `packages/shared/src/<modulo>/`, `apps/api/src/<modulo>/`, desde `origin/develop`). Issues: web #<n>, mobile #<n>, epic #<n>. Los modelos de código preguntaron por: <dudas>. Publicá sobre la misma URL, con claro y oscuro de cada board y las decisiones en notas. Mismo cierre: lista flujo por flujo, hallazgos del lint contra el DS, y preguntame todas las suposiciones.
