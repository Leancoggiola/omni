import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { ScrollView } from 'react-native';
import { Paragraph, YStack } from 'tamagui';

import { useAuth } from '@/core/auth';
import { Screen, SectionCard, Title } from '@/shared/ui';

import { HolidaysCard } from './components/HolidaysCard';

const NAME_SKELETON = { width: 160, height: 28 } as const;

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Inicio (= `HomeMainCard` de web): una card con el saludo y las efemérides adentro, sin `ScreenHeader`. */
export function HomeScreen() {
  const { user, isLoading } = useAuth();
  const greeting = timeGreeting();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <SectionCard>
          {/* Sin ScreenHeader, el saludo es lo primero que lee un lector de pantalla: lleva el nombre de la pantalla. */}
          <YStack
            gap={SPACING['2xs']}
            accessible
            accessibilityRole="header"
            accessibilityLabel={`Inicio. ${greeting}, ${isLoading ? 'cargando' : (user?.name ?? '—')}`}
          >
            <Paragraph color="$dimmed" fontSize={FONT_SIZE.md}>
              {greeting}
            </Paragraph>
            {isLoading ? (
              <YStack
                {...NAME_SKELETON}
                borderRadius={RADIUS.sm}
                backgroundColor="$dimmedSurface"
                accessible
                accessibilityLabel="Cargando tu nombre"
              />
            ) : (
              <Title order={3} color="$primary">
                {user?.name ?? '—'}
              </Title>
            )}
          </YStack>
          <HolidaysCard />
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}
