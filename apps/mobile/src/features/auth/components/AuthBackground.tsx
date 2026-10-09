import { BRAND, TERRACOTTA } from '@omni/shared/theme';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/** Mismo ancho de corte que el `@media (max-width: 480px)` del fondo de web. */
const SMALL_SCREEN = 480;
const SMALL_SIZE = 300;
const OPACITY = 0.65;

type Blob = {
  color: string;
  size: number;
  /** Duración de un ciclo (web: 10 / 8 / 6 s, en `alternate`). */
  duration: number;
  position: (width: number, height: number, size: number) => ViewStyle;
};

/** Las tres formas de `AnimatedBackground.scss`: brand-4, terracota-6 y brand-3. */
const BLOBS: readonly Blob[] = [
  { color: BRAND[4], size: 600, duration: 10_000, position: () => ({ top: -150, left: -100 }) },
  { color: TERRACOTTA[6], size: 500, duration: 8_000, position: () => ({ bottom: -100, right: -50 }) },
  {
    color: BRAND[3],
    size: 400,
    duration: 6_000,
    position: (width, height) => ({ top: height * 0.15, right: width * 0.15 }),
  },
];

/**
 * Keyframes de `move-smooth` de web (0 → 50 % → 100 %), recorridos de ida y vuelta (`alternate`) con
 * easing in-out.
 */
function useDrift(duration: number, enabled: boolean) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(progress);
  }, [duration, enabled, progress]);

  return useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 0.5, 1], [0, 60, -150]) },
      { translateY: interpolate(progress.value, [0, 0.5, 1], [0, 100, 50]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.1, 1]) },
      { rotate: `${interpolate(progress.value, [0, 0.5, 1], [0, 45, 90])}deg` },
    ],
  }));
}

function BlobShape({ blob, id, animate }: { blob: Blob; id: string; animate: boolean }) {
  const { width, height } = useWindowDimensions();
  const size = width < SMALL_SCREEN ? SMALL_SIZE : blob.size;
  const style = useDrift(blob.duration, animate);

  return (
    <Animated.View style={[styles.blob, blob.position(width, height, size), { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* RN no tiene `filter: blur(60px)` en Android: la caída radial a transparente lo imita. */}
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={blob.color} stopOpacity={OPACITY} />
            <Stop offset="0.55" stopColor={blob.color} stopOpacity={OPACITY * 0.75} />
            <Stop offset="1" stopColor={blob.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Fondo animado del login (= `AnimatedBackground` de web): tres manchas de marca que derivan. Con
 * "reducir movimiento" del sistema (se lee al montar) quedan quietas. Es decorativo: no recibe toques ni lo lee TalkBack.
 */
export function AuthBackground() {
  const reducedMotion = useReducedMotion();

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {BLOBS.map((blob, index) => (
        // La lista es fija: el índice es una key estable aunque dos manchas compartan color.
        <BlobShape key={index} blob={blob} id={`auth-blob-${index}`} animate={!reducedMotion} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute' },
});
