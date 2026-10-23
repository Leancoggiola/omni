import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * "Reducir movimiento" del sistema (= `useReducedMotion` de Mantine en web). Arranca con el valor de Reanimated, que
 * se lee sin esperar pero es el de cuando abrió la app; al montar lo confirma con `isReduceMotionEnabled` (por si se
 * cambió con esta pantalla desmontada) y después sigue los cambios con la pantalla abierta.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(useReducedMotion());

  useEffect(() => {
    let changedMeanwhile = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
      changedMeanwhile = true;
      setReduceMotion(enabled);
    });
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (!changedMeanwhile) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    return () => subscription.remove();
  }, []);

  return reduceMotion;
}
