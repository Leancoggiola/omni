import { useEffect, useRef } from 'react';
import { Animated, Linking, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useColorSchemeControl } from '@/core/theme';
import { gradientPoints } from '@/theme/gradient';
import { BRAND, GRADIENT_STOPS, SEMANTIC } from '@omni/shared/theme';

import { useHolidayCarousel, useTodayHolidays } from '../hooks';

const HOLIDAY_DURATION = 3000;
const CARD_MIN_HEIGHT = 60;

function HolidayProgress({ duration, color }: { duration: number; color: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, duration]);

  return (
    <Animated.View
      style={[styles.progress, { backgroundColor: color, transform: [{ scaleX: progress }] }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export function HolidaysCard() {
  const { holidays, isLoading, error } = useTodayHolidays();
  const { colorScheme } = useColorSchemeControl();
  const { currentIndex, currentItem, next } = useHolidayCarousel(holidays.items, HOLIDAY_DURATION);

  const isDark = colorScheme === 'dark';
  const s = SEMANTIC[colorScheme];

  if (error) {
    return (
      <YStack borderWidth={1} borderColor="$borderColor" borderRadius="$4" padding="$4">
        <Paragraph color="$destructive">No se pudieron cargar las efemérides de hoy</Paragraph>
      </YStack>
    );
  }

  if (isLoading) {
    return (
      <YStack
        minHeight={CARD_MIN_HEIGHT}
        borderRadius="$4"
        backgroundColor="$color3"
        accessibilityLabel="Cargando efemérides"
      />
    );
  }

  const gradient = isDark ? GRADIENT_STOPS.cardDark : GRADIENT_STOPS.cardLight;
  const hasCarousel = holidays.items.length > 1;

  return (
    <Pressable
      onPress={next}
      disabled={!hasCarousel}
      accessibilityHint={hasCarousel ? 'Muestra la siguiente efeméride' : undefined}
    >
      <YStack borderWidth={1} borderColor="$borderColor" borderRadius="$4" overflow="hidden">
        <LinearGradient
          colors={[gradient.from, gradient.to]}
          {...gradientPoints(gradient.deg)}
          style={StyleSheet.absoluteFill}
        />

        <XStack gap="$3" padding="$3" alignItems="flex-start" minHeight={CARD_MIN_HEIGHT}>
          <YStack backgroundColor={s.white} borderRadius="$3" padding="$2">
            <MaterialCommunityIcons name="party-popper" size={20} color={BRAND[7]} />
          </YStack>

          <YStack flex={1} gap="$1">
            <Paragraph fontWeight="700" color={s.black}>
              Efemérides de hoy
            </Paragraph>

            {holidays.items.length === 0 && (
              <Paragraph size="$2" fontWeight="600" color={s.black}>
                Hoy no hay efemérides registradas
              </Paragraph>
            )}

            {currentItem && (
              <Paragraph size="$2" fontWeight="600" color={s.black}>
                {currentItem.title}
                {currentItem.isArgentina ? ' · en Argentina' : ''}
              </Paragraph>
            )}
          </YStack>

          <Pressable
            onPress={() => void Linking.openURL(holidays.sourceUrl)}
            accessibilityRole="link"
            accessibilityLabel="Ver efemérides de hoy en Wikipedia"
            hitSlop={8}
          >
            <Ionicons name="open-outline" size={18} color={s.black} />
          </Pressable>
        </XStack>

        {hasCarousel && (
          <HolidayProgress
            key={currentIndex}
            duration={HOLIDAY_DURATION}
            color={isDark ? s.white : SEMANTIC.light.primary}
          />
        )}
      </YStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  progress: {
    height: 3,
    width: '100%',
    transformOrigin: 'left',
  },
});
