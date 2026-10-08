# Mobile — tooling (scripts)

Convenciones de `apps/mobile`: [apps/mobile/CLAUDE.md](../../apps/mobile/CLAUDE.md) (Claude Code lo carga al trabajar en esa carpeta). Índice general: [CLAUDE.md](../../CLAUDE.md).

## Scripts

```bash
pnpm dev:mobile
pnpm --filter mobile check-types
pnpm --filter mobile lint
pnpm --filter mobile prebuild
```

Env: `apps/mobile/.env` ← `EXPO_PUBLIC_API_URL` (ver [apps/mobile/README.md](../../apps/mobile/README.md)).

## Correr la app en un emulador Android (Windows)

La app usa un **development build** (no Expo Go): hay que compilar la parte nativa una vez por máquina y cada vez que cambie una dependencia nativa (`npx expo install` de un módulo nativo, plugins de `app.json`). Los cambios de JS/TS no requieren recompilar: llegan por Metro con Fast Refresh.

### Setup (una sola vez por máquina)

1. **Android Studio** (trae SDK, emulador y un JBR). Crear un AVD desde _Device Manager_ (x86_64, Google APIs).
2. **JDK 17** aparte: el JBR de Android Studio puede venir con Java 25 y Gradle 8.14 (el que fija Expo 54 / RN 0.81) solo soporta hasta Java 24 — falla con `Unsupported class file major version 69`. Con winget: `winget install EclipseAdoptium.Temurin.17.JDK`. No desinstalar el JBR: lo usa Android Studio.
3. **Variables de usuario**: `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk`, `JAVA_HOME=<carpeta de Temurin 17>` y en `Path` `%ANDROID_HOME%\platform-tools` y `%ANDROID_HOME%\emulator`. Reiniciar terminal/IDE para que las tomen. Verificar con `adb version`, `emulator -list-avds` y `java -version`.
4. **`apps/mobile/.env`** con `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` (`10.0.2.2` es el host visto desde el emulador; en un celular físico va la IP LAN, ver `.env.example`).
5. **Rutas largas.** Con el layout aislado de pnpm (`node_modules/.pnpm/<pkg>@<versión>_<hash>/…`) las rutas de los objetos C++ que genera el build en `.cxx/` superan los 260 caracteres. Hacen falta dos cosas:
   - Habilitar `LongPathsEnabled` (PowerShell como admin, una vez; aplica a los procesos que arranquen después):
     ```powershell
     New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force
     ```
   - Instalar **CMake 3.31 o superior (probado con 4.1.2)** desde Android Studio → _SDK Manager_ → _SDK Tools_ → _Show Package Details_ → CMake. El que baja Gradle por defecto (3.22) trae un `ninja` que no soporta rutas largas aunque Windows sí: el build falla con `ninja: error: manifest 'build.ninja' still dirty after 100 tries`.
   - Apuntar el build a esa versión en `apps/mobile/android/local.properties` (gitignoreado):
     ```properties
     sdk.dir=C\:/Users/<usuario>/AppData/Local/Android/Sdk
     cmake.dir=C\:/Users/<usuario>/AppData/Local/Android/Sdk/cmake/4.1.2
     ```
     `expo prebuild --clean` borra `android/` entero: después de cada prebuild hay que volver a escribir `cmake.dir`.
   - Plan B si CMake 4 corta con `Compatibility with CMake < 3.5 has been removed` (alguna librería nativa declara un `cmake_minimum_required` viejo): correr el build con la variable `CMAKE_POLICY_VERSION_MINIMUM=3.5` en esa terminal.

### Correr

```bash
pnpm dev:api                                   # API en :3000
emulator -avd <nombre-del-avd>                 # o desde Device Manager
pnpm --filter mobile exec expo run:android     # primera vez / cambios nativos: compila, instala y abre
pnpm dev:mobile                                # resto de las veces: solo Metro
adb reverse tcp:8081 tcp:8081                  # el dev client llega a Metro por localhost
```

Si el dev client muestra `SocketTimeoutException` al abrir, está intentando llegar a Metro por la IP LAN (firewall): con el `adb reverse` y abriendo `http://localhost:8081` desde el menú del dev client se resuelve.

### Por qué tarda y cómo acelerarlo

| Paso                         | Primera vez      | Después                   | Cómo mejorarlo                                                                                                                                                                        |
| ---------------------------- | ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build nativo (`run:android`) | 5–10 min         | 1–4 min (caché de Gradle) | Solo cuando cambian deps nativas. Compilar una sola arquitectura: variable de usuario `ORG_GRADLE_PROJECT_reactNativeArchitectures=x86_64` (por defecto compila también `arm64-v8a`). |
| Descargas del SDK            | NDK, CMake, etc. | —                         | Las baja Gradle solo la primera vez (~1–2 GB).                                                                                                                                        |
| `pnpm install`               | varios minutos   | —                         | Ver Defender abajo.                                                                                                                                                                   |
| Bundle de Metro              | ~25 s            | segundos (caché)          | No usar `--clear` salvo que cambie `metro.config.js`, `babel.config.js` o la config de Tamagui.                                                                                       |

Lo que más pesa en Windows es **Microsoft Defender** escaneando cada archivo que tocan pnpm, Gradle y Metro. Agregar exclusiones (Seguridad de Windows → Protección contra virus → Exclusiones; requiere admin) para la carpeta del repo, `%USERPROFILE%\.gradle`, `%LOCALAPPDATA%\Android\Sdk` y el store de pnpm (`pnpm store path`) suele bajar los tiempos a la mitad o menos.

### Problemas conocidos (ya resueltos en el repo)

- **No usar `node-linker=hoisted`.** Aplana `node_modules` y esquiva las rutas largas, pero rompe web: el monorepo tiene dos versiones de React (React Native 0.81 exige 19.1.0 y Mantine/react-router piden ≥19.2), con hoisted la raíz queda con la de mobile y web termina con dos instancias de React (`Cannot read properties of null (reading 'useState')` en los tests). La solución es la de rutas largas del setup (`LongPathsEnabled` + CMake ≥3.31). Si alguna vez se cambia el linker, borrar **todos** los `node_modules` antes de reinstalar: pnpm no limpia las junctions del layout anterior.
- **`metro.config.js` fuerza la build CommonJS de `swr`.** swr publica builds CJS y ESM con contextos separados; si el bundle mezcla las dos, los hooks de `swr/immutable` no ven el `fetcher` del `SWRConfig` y nunca piden datos (pantallas en loading infinito o vacías).
- **`tamagui.config.ts` tiene `export default`.** El compilador de `@tamagui/babel-plugin` solo encuentra la config así; sin eso la descarta, reintenta en cada archivo y el bundle se cuelga.
- **Fuente Montserrat (igual que web).** `app/_layout.tsx` carga las caras 400/500/600/700 (`src/theme/fonts.ts`) y `tamagui.config.ts` mapea cada `fontWeight` a su cara: sin eso Android ignora las negritas. Se importan por peso (`@expo-google-fonts/montserrat/700Bold`): el barrel del paquete mete los 18 `.ttf` en el bundle.
- **Íconos Phosphor (`phosphor-react-native`).** Mismos nombres que `@phosphor-icons/react` en web (`HouseIcon`, `FilmSlateIcon`, …). Depende de `react-native-svg`, que es nativo: al agregarlo o actualizarlo hay que rebuildear el dev client (`pnpm --filter mobile prebuild` + `expo run:android`).

## Relación con web

| Tema      | Web            | Mobile               |
| --------- | -------------- | -------------------- |
| UI        | Mantine        | Tamagui              |
| Auth      | Cookies        | Bearer + SecureStore |
| Paths     | `SWR_KEYS`     | `API_KEYS`           |
| Contratos | `@omni/shared` | `@omni/shared`       |

Nuevo feature: [new-feature.md](./new-feature.md). Web: [web/tooling.md](../web/tooling.md).
