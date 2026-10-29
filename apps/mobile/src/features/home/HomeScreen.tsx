import { getTimeGreeting } from '@omni/shared/common';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { ScrollView } from 'react-native';
import { Paragraph, YStack } from 'tamagui';

import { useAuth } from '@/core/auth';
import { DisplayTitle, Screen, SectionCard } from '@/shared/ui';

import { HolidaysCard } from './components/HolidaysCard';

const NAME_SKELETON = { width: 160, height: 36 } as const;
const GREETING_LINE_HEIGHT = 24;

/**
 * Inicio (= `HomeMainCard` de web): una card glass con el saludo, el nombre en `display` y las efemérides adentro,
 * sin `ScreenHeader`.
 */
export function HomeScreen() {
  const { user, isLoading } = useAuth();
  const greeting = getTimeGreeting();
  const name = user?.name ?? '—';

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <SectionCard>
          <YStack
            gap={SPACING['2xs']}
            accessible
            accessibilityRole="header"
            accessibilityLabel={`Inicio. ${greeting}, ${isLoading ? 'cargando' : name}`}
          >
            <Paragraph color="$dimmed" fontSize={FONT_SIZE.lg} lineHeight={GREETING_LINE_HEIGHT} fontWeight="500">
              {greeting}
            </Paragraph>
            {isLoading ? (
              <YStack
                {...NAME_SKELETON}
                borderRadius={RADIUS.sm}
                backgroundColor="$disabledSurface"
                accessible
                accessibilityLabel="Cargando tu nombre"
              />
            ) : (
              <DisplayTitle size="lg" accent={name} header={false}>
                {name}
              </DisplayTitle>
            )}
          </YStack>
          <HolidaysCard />
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}
