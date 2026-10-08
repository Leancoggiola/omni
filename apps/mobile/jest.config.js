/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // El preset de jest-expo mapea `@/` a la raíz; acá `@/` es `src/` (ver `tsconfig.json`).
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Lista del preset de jest-expo + los paquetes que publican ESM sin build CommonJS para native.
  // Con pnpm cada paquete vive en `node_modules/.pnpm/<pkg>@<v>/node_modules/<pkg>`: el `.pnpm` deja
  // pasar el primer `node_modules/` y el nombre del paquete decide en el segundo.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|tamagui|@tamagui|phosphor-react-native))',
    '/node_modules/react-native-reanimated/plugin/',
  ],
};
