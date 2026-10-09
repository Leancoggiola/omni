import { useEffect, useRef } from 'react';
import { Animated, Linking, Pressable, StyleSheet, type AccessibilityActionEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowSquareOutIcon, ConfettiIcon } from 'phosphor-react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useColorSchemeControl } from '@/core/theme';
import { ErrorState } from '@/shared/ui';
import { gradientPoints } from '@/theme/gradient';
import { BRAND, GRADIENT_STOPS, RADIUS, SEMANTIC } from '@omni/shared/theme';

import { useHolidayCarousel, useTodayHolidays } from '../hooks';

const HOLIDAY_DURATION = 3000;
const CARD_MIN_HEIGHT = 60;
// `activate` es el doble toque de VoiceOver/TalkBack sobre el elemento enfocado.
const CAROUSEL_A11Y_ACTIONS = [{ name: 'activate', label: 'Siguiente efeméride' }];

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
  const { holidays, isLoading, error, retry } = useTodayHolidays();
  const { colorScheme } = useColorSchemeControl();
  const { currentIndex, currentItem, next } = useHolidayCarousel(holidays.items, HOLIDAY_DURATION);

  const isDark = colorScheme === 'dark';
  const s = SEMANTIC[colorScheme];

  if (error) {
    return <ErrorState message="No se pudieron cargar las efemérides de hoy" onRetry={retry} />;
  }

  if (isLoading) {
    return (
      <YStack
        minHeight={CARD_MIN_HEIGHT}
        accessible
        borderRadius={RADIUS.lg}
        backgroundColor="$dimmedSurface"
        accessibilityLabel="Cargando efemérides"
      />
    );
  }

  const gradient = isDark ? GRADIENT_STOPS.cardDark : GRADIENT_STOPS.cardLight;
  const hasCarousel = holidays.items.length > 1;
  const itemLabel = currentItem
    ? `${currentItem.title}${currentItem.isArgentina ? ', en Argentina' : ''}`
    : 'Hoy no hay efemérides registradas';

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'activate') next();
  };

  const openSource = () => {
    // Sin app que abra el link (o URL inválida): no hay nada útil que mostrar, solo evitar el
    // unhandled rejection.
    Linking.openURL(holidays.sourceUrl).catch(() => {
      // noop
    });
  };

  // Lectores de pantalla: el Pressable externo no es accesible (si agrupara a sus hijos,
  // VoiceOver nunca llegaría al link de Wikipedia). La acción de avanzar vive en el bloque de
  // texto, que no contiene el link; con un solo ítem ese bloque es solo texto, no botón.
  return (
    <Pressable onPress={next} disabled={!hasCarousel} accessible={false}>
      <YStack borderWidth={1} borderColor="$borderColor" borderRadius={RADIUS.lg} overflow="hidden">
        <LinearGradient
          colors={[gradient.from, gradient.to]}
          {...gradientPoints(gradient.deg)}
          style={StyleSheet.absoluteFill}
        />

        <XStack gap="$3" padding="$3" alignItems="flex-start" minHeight={CARD_MIN_HEIGHT}>
          <YStack backgroundColor={s.white} borderRadius="$3" padding="$2">
            <ConfettiIcon size={20} color={BRAND[7]} />
          </YStack>

          <YStack
            flex={1}
            gap="$1"
            accessible
            accessibilityLabel={`Efemérides de hoy. ${itemLabel}`}
            accessibilityRole={hasCarousel ? 'button' : undefined}
            accessibilityHint={hasCarousel ? 'Muestra la siguiente efeméride' : undefined}
            accessibilityActions={hasCarousel ? CAROUSEL_A11Y_ACTIONS : undefined}
            onAccessibilityAction={hasCarousel ? onAccessibilityAction : undefined}
          >
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
            onPress={openSource}
            accessibilityRole="link"
            accessibilityLabel="Ver efemérides de hoy en Wikipedia"
            hitSlop={8}
          >
            <ArrowSquareOutIcon size={18} color={s.black} />
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
