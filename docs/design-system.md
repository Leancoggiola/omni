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
- **Nada de verdes/azules crudos de Mantine.** `color="green"` o `color="blue"` rompen la paleta — usar los alias semánticos (`success`, `info`, `warning`, `destructive`).

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

### Familias semánticas

| Prefijo      | Ejemplo                                 |
| ------------ | --------------------------------------- |
| `text-*`     | `--mantine-color-text-dimmed`           |
| `surfaces-*` | `--mantine-color-surfaces-accent-light` |
| `border-*`   | `--mantine-color-border-success`        |
| `icons-*`    | `--mantine-color-icons-error`           |

Cada familia tiene variantes `primary`, `destructive`, `dimmed`, `disabled` y las semánticas `success` / `warning` / `info` / `error` / `accent`.

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

## Componentes compartidos (web)

| Componente                                   | Uso                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `PageHeader` (`@/shared/ui`)                 | Cabecera de página: chip de ícono terracota + título + subtítulo + `actions` |
| `NotificationCard` (`@/shared/ui`)           | Contenido de toast, vía `renderNotification` de Mantine 9.6                  |
| `LoadingState` / `EmptyState` / `ErrorState` | Estados de UI (ver `apps/web/CLAUDE.md`)                                     |

### Notificaciones

`notifySuccess` / `notifyError` / `notifyWarning` / `notifyInfo` desde `@/shared/ui`. Las features **no** importan `@mantine/notifications` directo.

Cada variante deriva su acento y su wash de los tokens semánticos (`icons-{variante}` y `surfaces-{variante}-light`), así que sumar una variante no requiere CSS nuevo por esquema.

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

Lo que ya es automático: cualquier cambio en `tokens.ts` llega a mobile vía `SEMANTIC` (fondo, card, texto, primario, éxito, destructivo, acento).

Lo que **no** es automático y hay que replicar a mano en mobile:

| Web                                   | Estado en mobile                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| Gradiente cálido del sidebar          | No aplica (mobile usa tabs, no sidebar)                                           |
| `PageHeader` con chip de ícono        | **Pendiente** — falta el equivalente Tamagui                                      |
| `NotificationCard` (4 variantes)      | **Pendiente** — mobile hoy usa `Alert.alert` nativo                               |
| Badges de tipo en terracota           | **Pendiente** — revisar `apps/mobile/src/features/media/components/MediaCard.tsx` |
| Estados media (neutro/terracota/sage) | **Pendiente** — verificar que mobile no use verde/azul crudos                     |

Al tocar el design system, correr siempre:

```bash
pnpm --filter @omni/shared check-types
pnpm --filter web check-types && pnpm --filter web lint && pnpm --filter web test
pnpm --filter mobile check-types
```

No hay test automatizado de color: la verificación es visual en ambos esquemas.
