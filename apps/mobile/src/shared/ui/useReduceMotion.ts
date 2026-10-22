import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * "Reducir movimiento" del sistema (= `useReducedMotion` de Mantine en web): arranca con el valor de Reanimated, que
 * se lee sincrónicamente, y se actualiza si se cambia con la pantalla abierta.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(useReducedMotion());

  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  return reduceMotion;
}
