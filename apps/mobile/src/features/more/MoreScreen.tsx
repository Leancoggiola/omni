import { useState } from 'react';
import { ScrollView } from 'react-native';
import { ADMIN_NAV_ORDER } from '@omni/shared/navigation';
import { SPACING } from '@omni/shared/theme';
import { SignOutIcon } from 'phosphor-react-native';
import { YStack } from 'tamagui';

import { useAuth } from '@/core/auth';
import { MORE_TAB } from '@/shared/navigation';
import { Button, getErrorMessage, notifyError, Screen, ScreenHeader, SectionCard } from '@/shared/ui';

import { NavRow } from './components/NavRow';
import { ThemeRow } from './components/ThemeRow';
import { UserCard } from './components/UserCard';
import { MORE_NAV_KEYS } from './moreNavKeys';

/** Launcher de "Más": cuenta, tema, módulos y administración (lo que en web es el navbar). */
export function MoreScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo cerrar la sesión'));
      setLoggingOut(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader icon={MORE_TAB.icon} title={MORE_TAB.label} subtitle="Tu cuenta y los módulos de Omni" />
      <ScrollView contentContainerStyle={{ gap: SPACING.md, paddingBottom: SPACING.xl }}>
        <UserCard />
        <SectionCard>
          <ThemeRow />
        </SectionCard>
        <SectionCard title="Módulos">
          <YStack gap={SPACING.xs}>
            {MORE_NAV_KEYS.map(key => (
              <NavRow key={key} navKey={key} />
            ))}
          </YStack>
        </SectionCard>
        {user?.role === 'ADMIN' ? (
          <SectionCard>
            {ADMIN_NAV_ORDER.map(key => (
              <NavRow key={key} navKey={key} />
            ))}
          </SectionCard>
        ) : null}
        <Button
          fullWidth
          variant="outline"
          color="destructive"
          leftSection={SignOutIcon}
          loading={loggingOut}
          onPress={() => void handleLogout()}
        >
          Cerrar sesión
        </Button>
      </ScrollView>
    </Screen>
  );
}
