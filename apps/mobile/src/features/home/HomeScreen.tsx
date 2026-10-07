import { Paragraph, Spinner, YStack } from 'tamagui';

import { useAuth } from '@/core/auth';

import { HolidaysCard } from './components/HolidaysCard';

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function HomeScreen() {
  const { user, isLoading } = useAuth();

  return (
    <YStack flex={1} padding="$4" gap="$3" backgroundColor="$background">
      <Paragraph theme="alt1">{timeGreeting()}</Paragraph>
      {isLoading ? (
        <Spinner />
      ) : (
        <Paragraph size="$8" fontWeight="700">
          {user?.name ?? '—'}
        </Paragraph>
      )}
      <Paragraph theme="alt2">Bienvenido a Omni</Paragraph>
      <HolidaysCard />
    </YStack>
  );
}
