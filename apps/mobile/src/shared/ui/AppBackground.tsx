import { StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useSemanticColors } from '@/core/theme';

const GLOW_SIZE = 420;

type GlowProps = { id: string; color: string; style: ViewStyle };

function Glow({ id, color, style }: GlowProps) {
  return (
    <View style={[styles.glow, style]}>
      <Svg width={GLOW_SIZE} height={GLOW_SIZE} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/**
 * Fondo de v2: las manchas radiales `glow-peach` (arriba a la derecha) y `glow-lilac` (a la izquierda, a media
 * altura) sobre el canvas. Son decorativas: quietas, sin toques y fuera de TalkBack, y el texto nunca va sobre ellas
 * sin una card.
 */
export function AppBackground() {
  const colors = useSemanticColors();
  const { height } = useWindowDimensions();

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Glow id="app-glow-peach" color={colors.glowPeach} style={{ top: -GLOW_SIZE * 0.3, right: -GLOW_SIZE * 0.35 }} />
      <Glow id="app-glow-lilac" color={colors.glowLilac} style={{ top: height * 0.38, left: -GLOW_SIZE * 0.5 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', width: GLOW_SIZE, height: GLOW_SIZE },
});
