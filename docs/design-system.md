# Design system

Fuente única de color y tokens para **web** (Mantine) y **mobile** (Tamagui).

Todo el color nace en `packages/shared/src/theme/tokens.ts`. Ningún cliente define hex propios: si un color no existe como token, se agrega ahí primero.

---

## Identidad

Paleta cálida **terracota + marrón**, con **sage** como contrapunto para "completado".

| Rol                | Escala       | Base      | Uso                                                          |
| ------------------ | ------------ | --------- | ------------------------------------------------------------ |
| Primario           | `BRAND`      | `#7A4530` | `primaryColor` de Mantine, nav activo, gradientes, links     |
| Acento             | `TERRACOTTA` | `#C1440E` | Chips de íconos, badges destacados, estado "en curso", glows |
| Éxito / completado | `SAGE`       | `#57764B` | Confirmaciones, "saldado", estado "vista"                    |
| Neutro cálido      | `CANVAS`     | —         | Fondo de página (`#F4F0EB` light / `#141313` dark)           |
| Superficie         | `SURFACE`    | —         | Cards y paneles (`#FFFDFB` light / `#211E1C` dark)           |

Reglas:

- **Nunca blanco puro ni gris frío** como fondo de página o card. El patrón es _canvas cálido + card cálida un tono más clara_.
- **`BRAND` vs `TERRACOTTA`**: brand es la estructura (nav activo, títulos, gradiente principal); terracota es el acento puntual. Si todo es terracota deja de ser acento.
- **Nada de verdes/azules crudos de Mantine.** `color="green"` o `color="blue"` rompen la paleta — usar los alias semánticos (`success`, `info`, `warning`, `destructive`). En web, ESLint marca los literales `color`/`c`/`bg` con un color por defecto de Mantine (`red`, `blue`…), pero es una red parcial: no ve expresiones (`color={cond ? 'red' : 'blue'}`), spreads ni `gray`/`dark`, que se usan a propósito para controles neutros (`gray` = `dimmed`).

---

## Arquitectura de tokens

```
packages/shared/src/theme/tokens.ts     escalas crudas + semanticLight/semanticDark + SEMANTIC
        │
        ├── apps/web/src/theme/palettes.ts        escalas → MantineColorsTuple
        ├── apps/web/src/theme/css-variables.ts   semantic* → CSS vars por esquema
        └── apps/mobile/src/theme/tamagui.config.ts   SEMANTIC → themes de Tamagui
```

### Capas

1. **Escalas crudas** (`BRAND`, `TERRACOTTA`, `SAGE`, `GRAY`, …) — objetos de 10-11 shades. No se consumen directo en features.
2. **Tokens semánticos** (`semanticLight` / `semanticDark`) — mapas de CSS vars agrupados en `text-*`, `surfaces-*`, `border-*`, `icons-*`. Es lo que consumen los componentes.
3. **Mapa compacto** (`SEMANTIC.light` / `SEMANTIC.dark`) — subset plano derivado de los anteriores, para consumidores sin CSS vars (Tamagui en mobile).

### Themes de Tamagui 3 (mobile)

`tamagui.config.ts` parte del pack congelado `@tamagui/config/v5` (Tamagui 3.3.3; no se pasó al v6, que cambia las escalas de espacio y de color y es una migración de diseño aparte) y pisa los themes desde `SEMANTIC`: `light` y `dark` (`surfaceTheme`), los de color `active` (primario) y `red` (destructivo), y los de `Input` y `TextArea`. Dos cambios respecto de Tamagui 2:

- **Los sub-themes por componente ya no existen.** Los componentes de Tamagui 3 no usan `light_Button`, `dark_active_Switch` y similares (el v5 de `@tamagui/config` los sigue definiendo): leen sus colores del theme en el que están. Lo que antes salía de `light_Switch` ahora sale de claves del theme base: la pista del Switch apagado lee `color-4` y `color-5` (en `border-subtle`) y encendido el Switch pasa al theme `active` (`activeTheme`), cuyo `background` es el relleno de marca. El único componente que sigue montándose en un theme propio es `Input`/`TextArea` (`<Theme name="Input">`), por eso `light_Input` y `light_TextArea` se siguen reconstruyendo. El `Sheet.Overlay` de Tamagui 3 lee `shadow-color` a opacidad 0,45 y casi no se ve: los sheets usan `SheetOverlay` de `@/shared/ui`, un `styled(Sheet.Overlay)` con `scrim` a opacidad plena (tiene que ser `styled`: `Sheet` reconoce el overlay entre sus hijos por su `staticConfig`, y un componente que lo envuelve no se pinta).
- **Cada clave compuesta existe en dos grafías** (`backgroundHover` y `background-hover`, `borderColor` y `border-color`, `placeholderColor` y `placeholder-color`, …) y los componentes de Tamagui 3 leen la segunda: `withKebabKeys` copia cada valor pisado a las dos (la lista de claves con guion sale del theme base de `@tamagui/config`, no está escrita a mano). El código de la app escribe los tokens **sin `$`** (`backgroundColor="surfaceGlass"`, `borderColor="border-color"`) y los estados dentro del valor (`backgroundColor="background press:background-press"`).

- **Los hex sueltos no los frena Tamagui.** El config pone `allowedStyleValues: false` (v5 lo trae encendido) para poder usar los nombres largos de RN y colores crudos de `SEMANTIC`: con eso Tamagui deja de validar los valores de estilo y el control de hex sueltos queda solo en ESLint (`hardcodedColorSelectors`, regla 4 del `CLAUDE.md` raíz).

Límites de Tamagui: el config ya no tiene `defaultProps`, así que el placeholder, el cursor y la selección del Input los fija `TextField` (`placeholderTextColor="placeholder-color"`, `cursorColor="primary"`, `selectionColor="primary"`); el Spinner y el texto de Button siguen sin color de marca por defecto. Por eso existen el `Spinner` de `@/shared/ui` (`primary` por defecto; ESLint prohíbe el de `tamagui`) y el `Button` propio, que fija el peso 600. Tamagui 3 tampoco trae driver de animaciones en ningún config: se suma `@tamagui/config/animations-rn` para los `transition` de los Sheet. El tamaño `4` de la fuente `body` (el que usa todo `Paragraph` sin `size`) se deja en 14 con interlineado 23, como el `$true` de Tamagui 2.

Los themes reemplazan el theme entero: un token propio (`destructive`, `disabledSurface`) solo resuelve si el theme parte de `surfaceTheme`. Por eso `inputTheme` y los themes de color (`active`, `red`) arrancan de `surfaceTheme` y pisan solo fondo y texto: una primitiva dentro de un `theme="active"` sigue teniendo sus colores. `tamagui.config.test.ts` verifica que resuelvan a `SEMANTIC` y que las dos grafías coincidan, y `tamagui.render.test.tsx` lo comprueba con Tamagui real (sin mock).

### Familias semánticas

| Prefijo      | Ejemplo                                 |
| ------------ | --------------------------------------- |
| `text-*`     | `--mantine-color-text-dimmed`           |
| `surfaces-*` | `--mantine-color-surfaces-accent-light` |
| `border-*`   | `--mantine-color-border-success`        |
| `icons-*`    | `--mantine-color-icons-error`           |

Cada familia tiene variantes `primary`, `destructive`, `dimmed`, `disabled` y las semánticas `success` / `warning` / `info` / `error` / `accent`.

En `SEMANTIC`, cada color de estado tiene su terna `{color}` (texto) / `{color}Surface` (wash) / `{color}Border`, igual que `text-*` / `surfaces-*-light` / `border-*` de web: `primary`/`primarySurface`/`primaryBorder`, `destructive`/`errorSurface`/`destructiveBorder`, y lo mismo para `success`, `warning`, `info`, `accent` y `dimmed`. Se suman los rellenos `filled`: `primaryFill`/`onPrimaryFill` (`Button` de marca: `BRAND[7]` en claro y `BRAND[4]` en oscuro, el `primaryShade` de web; `primary` queda para texto y acentos), `accentFill`/`onAccentFill` (Badge de tipo: `TERRACOTTA[7]` / `[4]`) y `destructiveFill`/`onDestructive` (`RED[7]` en los dos esquemas, como la paleta `destructive` de web; `destructive` es el rojo de texto: `RED[9]` en claro y `RED[4]` en oscuro). Más `disabledSurface`/`disabledText` (= `--mantine-color-disabled*`). Son los que usan `Button`, `Badge`, `Banner` y el estado deshabilitado.

**Texto sobre un relleno: `onFill()`.** Todo `on*` de un relleno sale de `onFill(fill)` de `@omni/shared/theme`: blanco o `CANVAS.dark`, el que más contraste da en ese esquema. En web, `cssVariablesResolver` genera `--mantine-color-<color>-on-filled` por esquema para cada paleta y el `variantResolver` lo usa en `filled`, en lugar del `autoContrast` de Mantine (que decide con el tono de claro y en oscuro dejaba texto blanco sobre el shade 4, ~3:1). Resultado en oscuro: texto oscuro sobre el Button de marca (5,5:1) y el Badge terracota (6,3:1). El hover (web, `--mantine-color-<color>-filled-hover`) y el presionado (mobile, `primaryFillHover`/`primaryFillPress`) se mueven hacia el lado que conserva el contraste: más oscuros con texto blanco, más claros con texto oscuro. El umbral es el de máximo contraste, no el 0,3 de luminancia de Mantine: en claro, `orange`, `indigo`, `teal` y `cyan` filled pasan a texto oscuro (hoy ninguna se usa filled). Los badges `success` y `dimmed` usan `onSuccess`/`onDimmed`, cada uno calculado sobre su propio fondo. Tests de regresión: `packages/shared/src/theme/__tests__/contrast.test.ts` (rellenos de `SEMANTIC`) y `apps/web/src/theme/__tests__/filledContrast.test.ts` (rellenos de web) exigen ≥ 4,5:1 (`WCAG_AA_TEXT`).

**Texto sobre fondos: AA en los dos esquemas (#137).** En claro, `text-primary` es `BRAND[6]` (no `BRAND[5]`, que daba 3,8:1 sobre `primarySurface` y 4,5:1 justo sobre el canvas) y `text-dimmed` es `GRAY[6]` (no `GRAY[5]`, 4,4:1 sobre el canvas); el hover del atenuado baja a `GRAY[7]` y el del link a `BRAND[6]`. El test de texto de `contrast.test.ts` mide texto, marca, atenuado, placeholder y link (y los hovers del atenuado y del link) sobre canvas y card, y la marca sobre su wash (compuesto sobre el fondo, porque en oscuro es translúcido). Si un token cambia y baja de 4,5:1, falla ahí.

**Texto de estado: AA sobre su wash (en claro).** Los washes de error, warning e info (`RED[1]`, `ORANGE[0]`, `BLUE[0]`) dejaban el texto en 3,84:1 (`RED[7]`), 4,18:1 (`ORANGE[8]`) y 4,12:1 (`BLUE[6]`). En claro el texto pasó a `RED[9]` (`#B41E25`, 5,5:1), `ORANGE[9]` (`#C3400D`, 4,8:1) y `BLUE[8]` (`#1665AE`, 5,4:1): `text-destructive` y `text-error` (y su hover y disabled), `text-warning` y `text-info`, o sea `SEMANTIC.light.destructive`/`warning`/`info`. Los íconos y bordes que comparten el tono de texto de warning e info (`icons-warning`, `icons-info`, `border-warning`, `border-info`) lo acompañan; los de error y destructive (`icons-error`, `icons-destructive`, `border-error`, `border-destructive`) siguen en `RED[7]` (como elementos gráficos piden 3:1). **No cambia el relleno:** `destructiveFill`, `surfaces-destructive` y el `filled` de la paleta `destructive` siguen en `RED[7]`, porque el blanco encima ya cumple. El oscuro ya cumplía y no se tocó. En web las paletas `info`, `warning`, `error` y `destructive` de `COLOR_PALETTE` se arman con `stateTuple`: el tono 9 (`-light-color`, texto de `light`) lleva el color AA y el 7 (relleno y `-text` en claro) también, salvo en `destructive`, cuyo relleno es `RED[7]`; el hover del relleno (tono 8) es `BLUE[9]` en `info` y igual al relleno en las otras tres, que ya no tienen un tono más oscuro (antes de este cambio las cuatro paletas eran de un solo tono y no tenían hover); en oscuro los tonos son los de antes. El test de estado de `contrast.test.ts` mide texto sobre canvas, card y wash (los dos esquemas) e íconos y bordes a 3:1 sobre el wash, y `filledContrast.test.ts` verifica que las paletas de web coincidan con esos tokens.

### Tokens v2 de color (#151)

Salen del Design System v2 (epic [#136](https://github.com/Leancoggiola/omni/issues/136)). Están definidos y registrados en los dos clientes; aplicarlos en pantallas es de #152 (mobile) y #154 (web).

| Token (DS)        | Claro             | Oscuro            | CSS var de web                          | Mobile (`SEMANTIC`) | Uso                                                             |
| ----------------- | ----------------- | ----------------- | --------------------------------------- | ------------------- | --------------------------------------------------------------- |
| `surface-glass`   | `SURFACE` al 82 % | `SURFACE` al 82 % | `--mantine-color-surfaces-glass`        | `surfaceGlass`      | Cards, chips, tab bar y navbar sobre el fondo con degradé       |
| `glass-border`    | blanco al 90 %    | blanco al 6 %     | `--mantine-color-border-glass`          | `glassBorder`       | Borde de 1 px de las superficies glass: un brillo, no una línea |
| `glow-peach`      | `#F6D3BA`         | `#3B2A20`         | `--mantine-color-surfaces-glow-peach`   | `glowPeach`         | Mancha cálida arriba a la derecha del fondo (degradé radial)    |
| `glow-lilac`      | `#ECDDE6`         | `#2A2230`         | `--mantine-color-surfaces-glow-lilac`   | `glowLilac`         | Segunda mancha, a la izquierda y a media altura                 |
| `hairline`        | `#EDE3DB`         | `#3A332E`         | `--mantine-color-border-hairline`       | `hairline`          | Divisores internos de cards y filas de lista                    |
| `border-subtle`   | `#E4D6CB`         | `GRAY[7]`         | `--mantine-color-border-subtle`         | `borderSubtle`      | Borde de inputs, chips sin marcar y botones secundarios         |
| `track`           | `#E4DAD2`         | `#3A332E`         | `--mantine-color-surfaces-track`        | `track`             | Riel de progreso, switch apagado y grabber de hojas             |
| `scrim`           | negro al 69 %     | negro al 69 %     | `--mantine-color-surfaces-overlay`      | `scrim`             | Velo detrás de los modales (web) y los sheets (`SheetOverlay`)  |
| `success-fill`    | `SAGE[6]`         | `SAGE[5]`         | `--mantine-color-surfaces-success-fill` | `successFill`       | "Marcar como saldado" y barras completadas                      |
| `on-success-fill` | `onFill(SAGE[6])` | `onFill(SAGE[5])` | `--mantine-color-text-on-success-fill`  | `onSuccessFill`     | Texto sobre `success-fill`: 5,1:1 en los dos esquemas           |

Las manchas `glow-*` son decorativas: nunca debajo de texto sin card (el atenuado sobre `glow-peach` da 4,48:1). El alfa de `surface-glass` sale de `OPACITY.glass` (0,82) con `withOpacity()`, no de un hex. `hairline`, `border-subtle` y `track` son líneas decorativas del DS: no se les exige 3:1 contra la card. Tests: `contrast.test.ts` (texto sobre card glass y sobre cada mancha, `success-fill`) y `tokensV2.test.ts`.

**`text-placeholder` (#151).** Pasó a AA sobre la card, donde viven los inputs: `GRAY[5]` en claro (4,9:1) y `DARK[2]` en oscuro (5,1:1); antes 3,0:1 y 2,6:1. Sigue siendo más suave que `text-dimmed`.

### Transparencias

Las variantes `*-disabled` y los `surfaces-*-light` de dark son un shade de la escala con alfa. Se escriben con el helper interno `withAlpha(SHADE, 'aa')` de `tokens.ts` (sufijo hex de 2 dígitos: `4d` ≈ 30 %, `29` ≈ 16 %, `33` = 20 %), nunca como hex literal: así un cambio en la escala se propaga a la versión translúcida.

### Radios, espaciado y elevación

`RADIUS`, `SPACING`, `SIZE`, `SHADOW` y `SHADOW_THEMED` (`@omni/shared/theme`) están en **px** y los consumen los dos clientes:

| Token           | Web (Mantine)                                           | Mobile (Tamagui)                                             |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `RADIUS`        | `theme.radius`, en rem (`apps/web/src/theme/tokens.ts`) | número: `borderRadius={RADIUS.lg}`                           |
| `SPACING`       | `theme.spacing`, en rem                                 | número: `padding={SPACING.md}`, `gap={SPACING.xs}`           |
| `SHADOW`        | — (web usa `SHADOWS` CSS de dos capas)                  | `shadowColor/Offset/Opacity/Radius` + `elevation` en Android |
| `SIZE`          | números (`SIZE.control.lg`)                             | número: `height={SIZE.control.md}`                           |
| `SHADOW_THEMED` | `shadows.card/float/sheet` (claro) + vars de oscuro     | `themedElevation('card', scheme)`                            |

**Escala de `RADIUS` (múltiplos de 4, #151):**

| Token  | px   | Uso                                                         |
| ------ | ---- | ----------------------------------------------------------- |
| `xs`   | 4    | Esquina "cola" de la burbuja del feed, chips de código      |
| `sm`   | 8    | Pósters y miniaturas                                        |
| `md`   | 12   | Inputs, chips de ícono, items del navbar                    |
| `lg`   | 16   | Banners, toasts, card destacada, filas tocables             |
| `xl`   | 24   | Cards, burbujas del feed, navbar web                        |
| `2xl`  | 32   | Hojas inferiores (borde superior)                           |
| `full` | 9999 | Pills: botones, chips, segmented, badges, tab bar, avatares |

La escala se renombró para coincidir con la del Design System (antes `md` era 8, `lg` 12 y `xl` 16). Los usos existentes bajaron un escalón de nombre (`lg` → `md`, `xl` → `lg`, `md` → `sm`) para conservar los píxeles; el único cambio visual es `sm` 6 → 8 y `xs` 2 → 4. El `defaultRadius` de Mantine es ahora `md` (12) y el de Paper/Card, `sm` (8). La clave `2xl` se declara en `mantine.d.ts`.

**`SIZE`:** `control` sm 36 / md 44 / lg 48 (Button lg era 50) / xl 56 ("Ingresar" del login mobile), `field` md 44 / lg 52 (campos del login mobile, con fuente de 16), `fab` 56, `tabBar` 72 y `avatar` xs 24 / sm 32 / md 40 / lg 80.

**`SHADOW_THEMED`** (desenfoque 32, desplazamiento 8 o 12, valor por esquema): `card` (cards glass, burbujas, navbar), `float` (tab bar, FAB, toasts) y `sheet` (hojas fijas, hacia arriba). Web las registra en `THEME.shadows` (claro) y `cssVariablesResolver` pisa `--mantine-shadow-*` en oscuro; en mobile se esparcen con `themedElevation(level, scheme)`. **`OPACITY`:** `glass` 0,82 y `disabledIcon` 0,5.

En mobile, **no** se registran como tokens de Tamagui (`lg`): Input, Select, Popover y ListItem derivan su padding y su radio de la escala `space`/`radius` del config, y sumarle valores la cambia. El código nuevo usa las constantes compartidas para que un `lg` signifique lo mismo en las dos plataformas; los tokens numéricos de `@tamagui/config` (`4`, `2`, …, ya sin `$`) quedan para el interior de los componentes de Tamagui. `SHADOW` replica la capa principal de cada sombra CSS de web: si cambia una, revisar la otra.

### Tipografía e íconos

Los dos clientes usan **Montserrat** (400/500/600/700) e íconos **Phosphor** con los mismos nombres (`@phosphor-icons/react` en web, `phosphor-react-native` en mobile). Un ícono nuevo se elige una vez y se usa igual en los dos.

**Títulos: familia `display` (#151).** Bricolage Grotesque (`DISPLAY_FONT`), sin itálica, con la palabra acentuada en `primary` (una por título, mismo peso). Web la carga en `index.html` (700 y 800) y la expone en `THEME.other.displayFontFamily` y `THEME.other.display` (en rem); mobile la carga con `useFonts` (`BRICOLAGE_FACES` en `src/theme/fonts.ts`, paquete `@expo-google-fonts/bricolage-grotesque`) y la registra como fuente `display` de Tamagui.

| Estilo (`DISPLAY`) | px / interlineado | Peso | Tracking | Uso                                                 |
| ------------------ | ----------------- | ---- | -------- | --------------------------------------------------- |
| `xl`               | 40 / 44           | 800  | −0,4 px  | Título de pantalla principal (Media, Juntadas)      |
| `lg`               | 32 / 36           | 800  | −0,4 px  | Nombre del saludo, título de juntada, hojas grandes |
| `md`               | 24 / 28           | 700  | —        | Títulos dentro de hojas y estados vacíos            |
| `accent`           | 32 / 36           | 800  | —        | La palabra acentuada de un título, en `primary`     |
| `amountHero`       | 48 / 52           | 800  | −1 px    | Monto protagonista (Agregar gasto, saldo total)     |

`OVERLINE` (12 / 16, 700, 0,6 px, en mayúsculas, Montserrat) es el encabezado de sección y el separador de día del feed. `display` solo admite los pesos 700 y 800: son las únicas caras cargadas y en mobile un peso menor se renderiza como 700 sin aviso. Los interlineados de `HEADING` y `LINE_HEIGHT` siguen como estaban: llevarlos a múltiplos de 4 mueve el alto de todo el texto y es parte de #152 y #154.

### Gradientes

`GRADIENT_STOPS` (`@omni/shared/theme`) define `from` / `to` / `deg` (convención CSS) de cada gradiente:

| Gradiente    | Stops                         | Uso                                    |
| ------------ | ----------------------------- | -------------------------------------- |
| `brand`      | `BRAND[5]` → `BRAND[7]`, 90°  | Avatares, `defaultGradient` de Mantine |
| `terracotta` | `TERRACOTTA[4]` → `[7]`, 90°  | Acentos puntuales                      |
| `cardLight`  | `BRAND[0]` → `BRAND[2]`, 215° | Card de efemérides de la home (light)  |
| `cardDark`   | `BRAND[4]` → `BRAND[5]`, 215° | Card de efemérides de la home (dark)   |

Web los expone como `GRADIENTS` (`apps/web/src/theme/gradients.ts`, tipados como `MantineGradient`); mobile los pasa a `expo-linear-gradient` convirtiendo `deg` a `start` / `end`. El texto sobre `cardLight` / `cardDark` usa `text-black` (`SEMANTIC.*.black` en mobile) en ambos esquemas: los dos fondos son claros/medios.

### Variante `light-custom` (Alert)

Es la variante por defecto de `Alert` en web (`apps/web/src/theme/components.tsx`). El resolver de `css-variables.ts` le pone de fondo `surfaces-{color}-light` y de borde `border-{color}`, así que `<Alert color="success">` usa la paleta semántica sin CSS propio.

---

## Agregar un color

1. Definir la escala en `packages/shared/src/theme/tokens.ts` y exportarla en `theme/index.ts`.
2. Mapearla a tokens semánticos en `semanticLight` **y** `semanticDark`.
3. Web: registrarla en `COLOR_PALETTE` (`apps/web/src/theme/palettes.ts`) y sumar el nombre a `AppColors` (`apps/web/src/theme/mantine.d.ts`).
4. Mobile: si hace falta en features, exponerla en `SEMANTIC` y en `surfaceTheme()` de `tamagui.config.ts`.

---

## Truco: tokens que se adaptan solos al esquema

Los tokens `surfaces-*-light` son **sólidos pálidos en light mode** y **rgba translúcidos en dark mode**. Gracias a eso, un mismo CSS funciona en ambos esquemas sin duplicar reglas:

```scss
/* NotificationCard.module.scss */
background: linear-gradient(135deg, var(--notif-wash) 0%, transparent 65%);
```

La excepción son los **washes sobre superficies casi blancas**: una mezcla que se ve bien sobre fondo oscuro desaparece sobre `#FFFDFB`. En esos casos hay que separar por esquema:

```scss
:root[data-mantine-color-scheme='light'] .appshell_navbar {
  --navbar-glow-top: color-mix(in srgb, var(--mantine-color-terracotta-4) 42%, transparent);
}
:root[data-mantine-color-scheme='dark'] .appshell_navbar {
  --navbar-glow-top: color-mix(in srgb, var(--mantine-color-terracotta-6) 24%, transparent);
}
```

---

## Componentes compartidos

Los dos clientes tienen `@/shared/ui` con la misma API; cambia la implementación (Mantine / Tamagui). Tabla de equivalencias web ↔ mobile:

| Web (Mantine)                                | Mobile (`@/shared/ui`)                       | Notas                                                                                                                         |
| -------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `PageHeader`                                 | `ScreenHeader`                               | Chip de ícono terracota + título + subtítulo                                                                                  |
| `Paper` / `ProfileSectionCard`               | `SectionCard`                                | Card cálida, radio `lg`, sombra `sm`                                                                                          |
| `Title order`                                | `Title order`                                | Escala `HEADING`                                                                                                              |
| `Button`                                     | `Button`                                     | Mismas `variant` (filled · outline · light · subtle). `color`: brand · destructive. sm 36 / md 44 / lg 50 dp (web md = 42 px) |
| `ActionIcon`                                 | `IconButton`                                 | `subtle` por defecto; `color="dimmed"` = `color="gray"`. `accessibilityLabel` obligatorio                                     |
| `TextInput`                                  | `TextField`                                  | `label` 14/600, `description`, `error`, `required`, `leftSection`, alto 44                                                    |
| `PasswordInput`                              | `PasswordField`                              | Ojo para mostrar u ocultar                                                                                                    |
| `Switch`                                     | `Switch`                                     | Con `label` arma la fila (texto a la izquierda, switch a la derecha)                                                          |
| `SegmentedControl size="sm" color="brand.6"` | `SegmentedControl`                           | Mismo `data` (strings u objetos); siempre a lo ancho                                                                          |
| `Badge`                                      | `Badge`                                      | `color` obligatorio: accent · dimmed. Tipo de media = `accent` filled sm                                                      |
| `Alert` (`light-custom`)                     | `Banner`                                     | Mismo wash y borde por color; error de formulario = `color="destructive"`                                                     |
| `Select`                                     | `Select`                                     | Campo de 44 dp con el valor y el caret; las opciones abren un `actionSheet()`                                                 |
| `Menu` / opciones sueltas                    | `actionSheet()`                              | Opciones en bottom sheet, check en la actual + "Cancelar"; `Promise` con el `value` o `null`                                  |
| `confirm()` (modal)                          | `confirm()` (bottom sheet)                   | `Promise<boolean>`                                                                                                            |
| `NotificationCard` + `notify*`               | `NotificationCard` + `notify*`               | Toasts de feedback (4 variantes)                                                                                              |
| `LoadingState` / `EmptyState` / `ErrorState` | `LoadingState` / `EmptyState` / `ErrorState` | Regla de oro 0                                                                                                                |
| `Loader`                                     | `Spinner`                                    | Color de marca por defecto                                                                                                    |
| `UserAvatar` (`Avatar name`)                 | `UserAvatar`                                 | Gradiente de marca; iniciales como Mantine ("Admin" → "AD")                                                                   |
| Select de estado (`.combobox_root[data-*]`)  | `StatusPill`                                 | Neutro / terracota / sage                                                                                                     |

Diferencias aceptadas: en mobile los botones de acción van a lo ancho (`fullWidth`) y apilados (ver "Botones de acción" en `apps/mobile/CLAUDE.md`); el md de Button y los campos miden 44 dp por área de toque; el selector de opciones es un bottom sheet en lugar de un dropdown.

### Notificaciones

`notifySuccess` / `notifyError` desde `@/shared/ui` (mobile suma `notifyWarning`). En web las features **no** importan `@mantine/notifications` directo; en mobile **no** usan `Alert.alert`.

Mismo diseño en las dos plataformas (#68): **abajo** (web `bottom-center`; mobile encima de la tab bar, que le informa su alto con `useSetNotificationsBottomOffset` desde `FloatingTabBar` mientras las tabs tienen el foco; si no, sobre el inset inferior o encima del teclado), **compacto** (padding xs/sm, título 12/700, mensaje 12 dimmed, X chica), **ícono suelto sin chip** y lavado **D**: una barra de 3 px del color del estado a la izquierda y el lavado horizontal que se desvanece al 90 %.

Cada variante deriva su acento (`icons-{variante}`: ícono y barra) y su lavado (`surfaces-{variante}-light`) de los tokens semánticos (en mobile, `SEMANTIC.successIcon`/`successSurface`, etc.), así que sumar una variante no requiere CSS nuevo por esquema. Mobile dibuja el lavado con `expo-linear-gradient` a 90°, terminando en el mismo color con alfa 0 (no `transparent`: Android interpola sin premultiplicar y deja una banda gris), y la barra con un Stack absoluto. Diferencias aceptadas: en mobile la X mide 36 dp (44 de toque) y la pila va **debajo** de los Sheets (`confirm()`, `actionSheet()`), porque comparten la franja inferior con sus botones.

---

## Logo y assets

El arte maestro vive en `branding/logo-master.png` (PNG cuadrado, fondo transparente, 2048×2048). **No se importa desde ninguna app**: es la fuente para regenerar todo lo demás sin reescalar hacia arriba.

La copia que se bundlea es `apps/web/src/assets/logo.png`, derivada del maestro a **512×512**. La consumen `LogoAvatar`, `AuthCard` y el favicon de `apps/web/index.html`. Se renderiza como máximo en un `Avatar` de ~72 px, así que 512 cubre pantallas retina de sobra — no subir la resolución sin motivo: el maestro a 2048 pesa 3,7 MB contra 253 KB de la versión bundleada, y este archivo se descarga en cada carga de la app.

Mobile no comparte el import: necesita seis derivados en `apps/mobile/assets/images/`, referenciados desde `apps/mobile/app.json`.

| Archivo                       | Tamaño    | Fondo            | Notas                                             |
| ----------------------------- | --------- | ---------------- | ------------------------------------------------- |
| `icon.png`                    | 1024×1024 | Opaco `#FBF1E9`  | iOS rechaza íconos con canal alfa                 |
| `favicon.png`                 | 48×48     | Transparente     | Favicon del build web de Expo                     |
| `splash-icon.png`             | 512×512   | Transparente     | El color de fondo lo pone `app.json`              |
| `android-icon-foreground.png` | 1024×1024 | Transparente     | Logo al **62%**: Android recorta el ~66%          |
| `android-icon-background.png` | 1024×1024 | Sólido `#E4BC9E` | Debe coincidir con `adaptiveIcon.backgroundColor` |
| `android-icon-monochrome.png` | 1024×1024 | Transparente     | Negro con alfa por luminancia (ver abajo)         |

### Regenerar los derivados

Al cambiar el logo hay que reemplazar `branding/logo-master.png` y regenerar desde ahí los seis de mobile **y** la copia de 512 de web. Un script descartable con `System.Drawing` alcanza (no requiere instalar nada en Windows):

```powershell
Add-Type -AssemblyName System.Drawing
$src = New-Object System.Drawing.Bitmap 'branding\logo-master.png'
# Por cada salida: crear Bitmap Format32bppArgb del tamaño destino,
# Graphics con InterpolationMode HighQualityBicubic, Clear(color o Transparent),
# DrawImage centrado con el escalado de la tabla, y Save como Png.
```

Dos detalles que no son obvios:

- **Padding del adaptive icon.** Android recorta la capa foreground a la máscara del launcher; solo el ~66% central está garantizado. Dibujar el logo al 100% hace que se coma los bordes.
- **Monochrome.** Aplanar el canal alfa a negro sólido produce un disco ilegible para un logo circular. Conviene mapear _luminancia → opacidad_ (`alpha = alpha * (1 - luminancia)`), así los trazos claros quedan transparentes y el dibujo se sigue leyendo.

Después de regenerar, actualizar en `app.json` los colores de fondo si cambió la paleta: `android.adaptiveIcon.backgroundColor` y el `backgroundColor` del plugin `expo-splash-screen`. Ambos deben salir de la escala `BRAND`.

---

## Paridad web ↔ mobile

Lo que ya es automático: cualquier cambio en `tokens.ts` llega a mobile vía `SEMANTIC` (fondo, card, texto, primario, éxito, destructivo, acento, superficies y bordes de estado, `onPrimary`/`onDestructive`) y vía `RADIUS`/`SPACING`. El plan de paridad completo está en el epic [#70](https://github.com/Leancoggiola/omni/issues/70).

Lo que **no** es automático y hay que replicar a mano en mobile:

| Web                                      | Estado en mobile                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gradiente cálido del sidebar             | No aplica (mobile usa tabs, no sidebar)                                                                                                                                                                                                                                                                                                                   |
| `PageHeader` con chip de ícono           | Hecho — `ScreenHeader` en las pantallas; Perfil suma `onBack` (IconButton de volver, sin header nativo)                                                                                                                                                                                                                                                   |
| `NotificationCard` (4 variantes)         | Hecho — `notify*`; ninguna pantalla usa `Alert.alert` (Media #68, Perfil #69) y ESLint lo prohíbe                                                                                                                                                                                                                                                         |
| Theme de componentes de Tamagui          | Hecho — themes base, de color e `Input`/`TextArea` desde `SEMANTIC` (#75); en Tamagui 3 ya no hay sub-themes por componente (#307)                                                                                                                                                                                                                        |
| Primitivas de formulario y acción        | Hechas (#76); las usan Login (#67), Media (#68) y Perfil (#69); ESLint prohíbe `Button`/`Input`/`Switch` crudos                                                                                                                                                                                                                                           |
| Login: card con logo, blobs y `Banner`   | Hecho (#67) — `LoginScreen` + `AuthBackground` (blobs de reanimated, quietos con "reducir movimiento")                                                                                                                                                                                                                                                    |
| Media: lista, filtros, agregar, estado   | Hecho (#68) — `MediaListItem` (póster 56 dp, `Badge`, `StatusPill`, tacho), `MediaToolbar`, FAB + Sheet                                                                                                                                                                                                                                                   |
| Media: vista en grilla                   | Hecho (#237) — `MediaViewToggle` (Lista/Grilla en el `action` del `ScreenHeader`, siempre abre en lista) y `MediaGridCard` (2 columnas, póster 2:3, badge y tacho encima, `StatusPill`)                                                                                                                                                                   |
| Contraste de rellenos en oscuro          | Hecho (#68) — `onFill()` en `SEMANTIC` y `--mantine-color-<color>-on-filled` en web                                                                                                                                                                                                                                                                       |
| Inicio: una card con saludo y efemérides | Hecho (#69) — `HomeScreen` = `HomeMainCard` de web (sin `ScreenHeader` ni ícono de destellos)                                                                                                                                                                                                                                                             |
| Inicio: widget fijo "Seguís viendo"      | Hecho (#236) — `WatchingCard` en web y mobile; hasta 3 ítems en "Viendo" vía `useWatchingMedia` (`home` no importa `media`), sin toggle ni "Personalizar"                                                                                                                                                                                                 |
| Inicio: widget de Clima                  | Hecho (#58) — `WeatherCard` en web (segunda columna de `HomeMainCard`) y mobile (debajo de las efemérides): ubicación del dispositivo, estados de carga, error y sin ubicación, "Ahora" sin ciudad, dato `stale` y atribución. El canvas solo dibuja el widget 4×1 del celular: la card y sus estados se armaron con ese widget y los estados compartidos |
| Perfil: cards, preferencias instantáneas | Hecho (#69) — Información personal, Preferencias (Switch + `SegmentedControl` de Tema, guardan al instante), Contraseña y Zona de peligro con `confirm()`                                                                                                                                                                                                 |
| Más: `Badge` de "Próximamente"           | Hecho (#69) — `NavRow` con `Badge color="dimmed"`; "Cerrar sesión" es un `Button` outline destructivo                                                                                                                                                                                                                                                     |
| Card de efemérides (gradiente)           | Hecho — `GRADIENT_STOPS` + `expo-linear-gradient`                                                                                                                                                                                                                                                                                                         |
| Montserrat + íconos Phosphor             | Hecho — `src/theme/fonts.ts` + `phosphor-react-native`                                                                                                                                                                                                                                                                                                    |
| Radios, espaciado, tamaños y sombras     | Hecho — `RADIUS` / `SPACING` / `SIZE` / `SHADOW_THEMED` de `@omni/shared/theme`                                                                                                                                                                                                                                                                           |
| Tema del perfil + toggle de sesión       | Hecho — `src/core/theme` (override en memoria; en web vive en `sessionStorage`)                                                                                                                                                                                                                                                                           |
| Cambio de tema sin saltos                | Hecho (#294) — fundido de 250 ms (`THEME_FADE_MS`; web: View Transitions, mobile: captura con `react-native-view-shot`), pista del tema del perfil para el primer cuadro (web: script de `index.html`; mobile: la splash la espera) y splash oscura                                                                                                       |
| Animación de arranque (solo mobile)      | Hecho (#332) — `core/launch`: continúa la splash nativa, la espiral gira y crece hacia su centro sobre el login o el Inicio; con "reducir movimiento", solo un fundido. Web no tiene splash                                                                                                                                                               |

### Diferencias aceptadas (#146)

Divergencias de comportamiento que se mantienen a propósito, una por plataforma:

- **Preferencias del perfil:** web guarda notificaciones y tema junto con los datos personales con "Guardar cambios"; mobile guarda cada preferencia al tocarla y la revierte si falla.
- **Errores al cambiar la contraseña:** web los muestra en un `Alert` dentro del formulario; mobile, en un toast, porque un `Alert` arriba de una pantalla larga no se ve.

Al tocar el design system, correr siempre:

```bash
pnpm --filter @omni/shared check-types
pnpm --filter web check-types && pnpm --filter web lint && pnpm --filter web test
pnpm --filter mobile check-types && pnpm --filter mobile lint
```

El contraste de texto y rellenos lo cubren los tests de `contrast.test.ts`; el resto del color se verifica a ojo en ambos esquemas.
