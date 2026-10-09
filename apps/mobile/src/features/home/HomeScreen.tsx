import { NAV_REGISTRY } from '@omni/shared/navigation';
import { HouseIcon } from 'phosphor-react-native';
import { Paragraph, Spinner } from 'tamagui';

import { useAuth } from '@/core/auth';
import { ProfileAvatarButton } from '@/shared/navigation';
import { Screen, ScreenHeader } from '@/shared/ui';

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
    <Screen>
      <ScreenHeader
        icon={HouseIcon}
        title={NAV_REGISTRY.home.label}
        subtitle="Bienvenido a Omni"
        actions={<ProfileAvatarButton />}
      />
      <Paragraph theme="alt1">{timeGreeting()}</Paragraph>
      {isLoading ? (
        <Spinner />
      ) : (
        <Paragraph size="$8" fontWeight="700">
          {user?.name ?? '—'}
        </Paragraph>
      )}
      <HolidaysCard />
    </Screen>
  );
}
