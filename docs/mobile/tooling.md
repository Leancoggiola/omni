# Mobile — tooling (scripts)

Convenciones de `apps/mobile`: [apps/mobile/CLAUDE.md](../../apps/mobile/CLAUDE.md) (Claude Code lo carga al trabajar en esa carpeta). Índice general: [CLAUDE.md](../../CLAUDE.md).

## Scripts

```bash
pnpm dev:mobile
pnpm --filter mobile check-types
pnpm --filter mobile lint
pnpm --filter mobile check-api-paths
pnpm --filter mobile test      # jest-expo; en CI corre como test:coverage vía turbo
pnpm --filter mobile check-structure
pnpm --filter mobile prebuild
```

Env: `apps/mobile/.env` ← `EXPO_PUBLIC_API_URL` (ver [apps/mobile/README.md](../../apps/mobile/README.md)).

## Correr la app en un emulador Android (Windows)

La app usa un **development build** (no Expo Go): hay que compilar la parte nativa una vez por máquina y cada vez que cambie una dependencia nativa (`npx expo install` de un módulo nativo, plugins de `app.json`). Los cambios de JS/TS no requieren recompilar: llegan por Metro con Fast Refresh.

### Setup (una sola vez por máquina)

1. **Android Studio** (trae SDK, emulador y un JBR). Crear un AVD desde _Device Manager_ (x86_64, Google APIs).
2. **JDK 17** aparte: el JBR de Android Studio puede venir con Java 25 y Gradle 9.0 (el de Expo 55 / RN 0.83) solo soporta hasta Java 24 — falla con `Unsupported class file major version 69`. Expo 56 y 57 (RN 0.85 / 0.86) traen Gradle 9.3.1, que ya soporta Java 25, pero se mantiene JDK 17 porque es el que se probó. Con winget: `winget install EclipseAdoptium.Temurin.17.JDK`. No desinstalar el JBR: lo usa Android Studio.
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
     Desde SDK 57 `expo prebuild` limpia por defecto (equivale a `--clean`) y borra `android/` entero: después de cada prebuild hay que volver a escribir `cmake.dir`.
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
| Bundle de Metro              | ~25 s            | segundos (caché)          | No usar `--clear` salvo que cambie `metro.config.js`, `babel.config.js`, `tamagui.build.ts` o la config de Tamagui.                                                                   |

Lo que más pesa en Windows es **Microsoft Defender** escaneando cada archivo que tocan pnpm, Gradle y Metro. Agregar exclusiones (Seguridad de Windows → Protección contra virus → Exclusiones; requiere admin) para la carpeta del repo, `%USERPROFILE%\.gradle`, `%LOCALAPPDATA%\Android\Sdk` y el store de pnpm (`pnpm store path`) suele bajar los tiempos a la mitad o menos.

### Problemas conocidos (ya resueltos en el repo)

- **No usar `node-linker=hoisted`.** Aplana `node_modules` y esquiva las rutas largas, pero rompe web: el monorepo tiene dos versiones de React (React Native 0.83 exige 19.2.0 exacto y web usa 19.2.8), con hoisted la raíz queda con la de mobile y web termina con dos instancias de React (`Cannot read properties of null (reading 'useState')` en los tests). La solución es la de rutas largas del setup (`LongPathsEnabled` + CMake ≥3.31). Si alguna vez se cambia el linker, borrar **todos** los `node_modules` antes de reinstalar: pnpm no limpia las junctions del layout anterior.
- **`metro.config.js` fuerza la build CommonJS de `swr`.** swr publica builds CJS y ESM con contextos separados; si el bundle mezcla las dos, los hooks de `swr/immutable` no ven el `fetcher` del `SWRConfig` y nunca piden datos (pantallas en loading infinito o vacías).
- **Compilador de Tamagui 3 (`@tamagui/metro-plugin`).** Lo instala `withTamagui` en `metro.config.js` (al final, después de forzar la build CommonJS de `swr` y de decidir `useWatchman`) y lee sus opciones de `tamagui.build.ts` (`components: ['tamagui']`, `config: './src/theme/tamagui.config.ts'`). Reemplaza a `@tamagui/babel-plugin`, que Tamagui 3 eliminó, y `babel.config.js` queda solo con `babel-preset-expo`. El paquete se usa suelto y no vía `@tamagui/cli/metro` (mismos exports) porque `@tamagui/cli` fija `typescript@7.0.2` y pnpm lo propaga como peer de `typescript-eslint`, que solo soporta hasta 6.0 (`eslint.config.test.js` deja de poder correr ESLint). Con el layout aislado de pnpm el plugin y la evaluación estática necesitan `metro` y `metro-resolver` (misma versión que usa Expo, hoy 0.87.1) y `@tamagui/core` y `@tamagui/web` como dependencias directas de `apps/mobile`: sin ellas el bundle falla con `Cannot find package '@tamagui/core' imported from …/.tamagui/…` o con `metro-resolver` sin resolver.
  - **`tamagui.config.ts` sigue con `export default`** (la guía de Tamagui 3 también lo pide) y exporta además `tamaguiConfig`.
  - **El compilador genera `.tamagui/`** en `apps/mobile` (gitignoreado, ESLint lo ignora) y un caché en `node_modules/.cache/tamagui`.
  - **Cambios de config.** Metro no invalida su caché de transformación cuando cambia el plan de Tamagui pero el código de la app no: tras tocar `tamagui.config.ts`, `tamagui.build.ts` o la versión de Tamagui hay que arrancar con `expo start -c`, y en un build con caché tibia borrar `node_modules/.cache/tamagui` y usar `expo export --clear` (`--reset-cache` en `expo export:embed`). El primer build tras limpiar es más lento: Tamagui mide ~12 ms por módulo para replanificar.
  - **Memoria.** Con Tamagui 2 el compilador vivía en `babel.config.js` y cada worker de Metro cargaba su copia de la config y de `tamagui` (~1,4 GB de pico por worker contra ~1 GB sin plugin, medido en octubre de 2026): en una máquina con muchos núcleos y poca RAM (WSL con 16 núcleos y 6 GB) se llenaban la RAM y el swap y el bundle parecía colgado al 99,9 %. Con `@tamagui/metro-plugin` el análisis corre una sola vez en el proceso principal de Metro y los workers leen el plan de un caché en disco (`compilerCacheRoot`), así que ya no multiplica la config por worker. Medido con `expo export --platform android` en una Mac M-series de 24 GB, SDK 57, caché fría (`/usr/bin/time -l`, pico del proceso más grande): Tamagui 2.7.7 5,3 GB en 21 s y Tamagui 3.3.3 3,4 a 4,0 GB en 23 s (el pico es el proceso principal de Metro; no se midió por worker). El `.hbc` pasa de 12.958.681 a 13.152.113 bytes (+1,5 %). Los consejos para máquinas justas siguen valiendo por si acaso: `--max-workers 2` en `export:embed` en Linux/WSL, `pnpm --filter mobile test --maxWorkers=2` en Jest y `expo start --no-dev --minify` desde `apps/mobile` para probar JS de producción en el dev client sin compilar un APK.
  - **Jest ya no corre el compilador.** Los tests ven los componentes sin aplanar, así que los `// tamagui-ignore` que se usaban para que los tests con mock no rompieran se sacaron. `jest.config.js` suma una transformación para `.mjs`: los paquetes de Tamagui 3 publican ESM en `.mjs` y Jest no los transforma por defecto.
- **Fuente Montserrat (igual que web).** `app/_layout.tsx` carga las caras 400/500/600/700 (`src/theme/fonts.ts`) y `tamagui.config.ts` mapea cada `fontWeight` a su cara: sin eso Android ignora las negritas. Se importan por peso (`@expo-google-fonts/montserrat/700Bold`): el barrel del paquete mete los 18 `.ttf` en el bundle.
- **Íconos Phosphor (`phosphor-react-native`).** Mismos nombres que `@phosphor-icons/react` en web (`HouseIcon`, `FilmSlateIcon`, …). Depende de `react-native-svg`, que es nativo: al agregarlo o actualizarlo hay que rebuildear el dev client (`pnpm --filter mobile prebuild` + `expo run:android`).

## Relación con web

| Tema           | Web                                                                     | Mobile                                                 |
| -------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| UI             | Mantine                                                                 | Tamagui                                                |
| Auth           | Cookies                                                                 | Bearer + SecureStore                                   |
| Paths          | `SWR_KEYS`                                                              | `API_KEYS`                                             |
| Contratos      | `@omni/shared`                                                          | `@omni/shared`                                         |
| React Compiler | No activado (ver [#29](https://github.com/Leancoggiola/omni/issues/29)) | **Activo** (`experiments.reactCompiler` en `app.json`) |

Nuevo feature: [new-feature.md](./new-feature.md). Web: [web/tooling.md](../web/tooling.md).

## Correr la app en un emulador Android (macOS, Apple Silicon)

Mismo flujo que en Windows, sin los pasos de rutas largas (no aplican) ni CMake aparte. Validado en una Mac M-series con 24 GB: build en frío de Gradle ~1m 40s–2m, emulador listo en ~20 s, primer bundle de Metro en segundos.

### Setup (una sola vez por máquina)

1. **Android Studio** + AVD **arm64** (por ejemplo Pixel con imagen Google APIs `arm64-v8a`).
2. **JDK 17** (Zulu o Temurin): `brew install --cask zulu@17`. Mismo motivo que en Windows: con Gradle 9.0 (Expo 55) Java 25 no funcionaba; Expo 56 y 57 traen Gradle 9.3.1, pero se mantiene JDK 17.
3. Variables de entorno (por ejemplo en un `~/omni-android-env.sh` que se hace `source` antes de trabajar):
   ```bash
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export ANDROID_SDK_ROOT=$ANDROID_HOME
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
   ```
4. `pnpm install`, `apps/api/.env` y `apps/mobile/.env` (`EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`).
5. **Cliente de Prisma**: `pnpm --filter api db:generate` (el cliente está gitignoreado; sin esto la API falla con `ERR_MODULE_NOT_FOUND` en `src/generated/prisma/client`).

### Correr

```bash
pnpm dev:api                                                   # :3000 (la base de dev es Supabase remoto, no hace falta Docker)
emulator -avd <nombre-del-avd> -no-snapshot-save               # esperar: adb wait-for-device
pnpm --filter mobile prebuild                                  # solo si no existe apps/mobile/android
(cd apps/mobile/android && ./gradlew app:installDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2)
pnpm --filter mobile start                                     # Metro
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW -d 'exp+omni://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'
```

Notas:

- Desde SDK 58 el APK de release sale con R8 (`android.enableMinifyInReleaseBuilds=true` en el `gradle.properties` que genera el prebuild): achica y ofusca el código Java/Kotlin. Con las dependencias de hoy no hace falta ninguna regla keep (el release arranca y no hay `ClassNotFoundException` en logcat); si una librería nueva usa reflexión y el release crashea al abrir, la regla va con `expo-build-properties`.
- Tras subir de SDK hay que regenerar `android/`: `pnpm --filter mobile prebuild`. Desde SDK 57 `expo prebuild` limpia por defecto (en SDK 56 hacía falta `--clean`); con `--no-clean` aplica los cambios sobre la carpeta existente.
- Al subir de SDK, alinear `metro` y `metro-resolver` (fijados sin `^` en `apps/mobile/package.json`) con el Metro que declara `@expo/metro`, la dependencia de `expo` que trae el Metro del SDK (`node -e "console.log(require('@expo/metro/package.json').dependencies)"` desde la carpeta de `expo` en el store de pnpm, o `pnpm why metro`). `@tamagui/metro-plugin` y el resto de `@tamagui/*` se suben con la versión de `tamagui` y tienen que seguir soportando ese Metro. `apps/mobile/metro.versions.test.js` (corre con `pnpm --filter mobile test`) falla si `metro` o `metro-resolver` difieren de los de `@expo/metro`. `expo-doctor` puede esperar otra versión (en SDK 58 pide ^0.84.6 aunque el CLI usa la 0.87.1): manda `@expo/metro`, y por eso `metro` y `metro-resolver` están en `expo.install.exclude`.
- `expo prebuild` agrega un script `"ios": "expo run:ios"` a `apps/mobile/package.json`: revertirlo (`git checkout apps/mobile/package.json`) antes de commitear.
- Si el primer bundle da `SocketTimeoutException`, pedirlo con `curl` (`launchAsset` del manifest con header `expo-platform: android`), `adb shell am force-stop com.omni.app` y reabrir.
- Con la API en un puerto distinto (varias sesiones en paralelo), `PORT` del entorno gana sobre el `.env` (dotenv no pisa variables ya definidas) y `EXPO_PUBLIC_API_URL` debe usar ese puerto.
- Varias sesiones en paralelo: un AVD por sesión (`emulator-5554`, `emulator-5556`), puertos de API y Metro distintos y `adb -s <serial>`. Cerrar el Gradle propio por PID, no con `--stop` (mataría el de las otras).
- `metro.config.js` desactiva Watchman solo cuando el proyecto vive bajo `.claude/worktrees/`: con Watchman, un worktree anidado (`.claude/worktrees/*`) hereda la raíz del checkout principal y el bundle falla con `Unable to resolve module whatwg-fetch`.
