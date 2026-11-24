import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { THEME_FADE_MS } from '@omni/shared/theme';

interface ThemeSnapshotFadeProps {
  uri: string;
  start: boolean;
  onLoad: () => void;
  onDone: () => void;
}

/**
 * Captura de la pantalla con el tema anterior, encima de todo, que se desvanece en `THEME_FADE_MS` (lo mismo que dura
 * el fundido de web). Avisa con `onLoad` cuando ya tapa la pantalla (recién ahí se aplica el tema nuevo) y empieza a
 * desvanecerse con `start`, después de que el tema nuevo se renderizó: espera dos cuadros más (el commit de React
 * llega antes que el pintado nativo de toda la pantalla) y arranca lento (`inOut`), así no se ve la pantalla nueva a
 * medio pintar a través de la captura. `fadeDuration={0}`: en Android `Image` aparece con un fundido propio de 300 ms.
 * No recibe toques ni lo lee TalkBack.
 */
export function ThemeSnapshotFade({ uri, start, onLoad, onDone }: ThemeSnapshotFadeProps) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!start) return;
    const animation = Animated.timing(opacity, {
      toValue: 0,
      duration: THEME_FADE_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        animation.start(({ finished }) => {
          if (finished) onDone();
        });
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      animation.stop();
    };
  }, [start, opacity, onDone]);

  return (
    <Animated.Image
      testID="theme-snapshot-fade"
      source={{ uri }}
      onLoad={onLoad}
      fadeDuration={0}
      resizeMode="stretch"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { opacity }]}
    />
  );
}
