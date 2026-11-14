import { View } from 'react-native';

/**
 * Doble mínimo de `react-native-reanimated` para Jest, con lo que usa la app (`AuthBackground`, `useReduceMotion`).
 * Reanimated 4.7 no carga en el entorno de Jest de RN: el código nativo pide `setCSSEventHandler`, que su módulo JS
 * no tiene, y el web (`react-native-reanimated/jest/resolver`) necesita un DOM. Se carga en `jest.setup.js`.
 */
function identity<T>(value: T): T {
  return value;
}

export default { View };
export const useSharedValue = <T>(value: T) => ({ value });
export const useAnimatedStyle = () => ({});
export const useReducedMotion = () => false;
export const withRepeat = identity;
export const withTiming = identity;
export const cancelAnimation = () => undefined;
export const interpolate = () => 0;
export const Easing = { inOut: identity, ease: identity };
