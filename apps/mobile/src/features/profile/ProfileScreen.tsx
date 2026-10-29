import { SPACING } from '@omni/shared/theme';
import { useRouter } from 'expo-router';
import { UserIcon } from 'phosphor-react-native';
import { KeyboardAvoidingView, ScrollView } from 'react-native';
import { YStack } from 'tamagui';

import { useAuth } from '@/core/auth';
import { useColorSchemeControl } from '@/core/theme';
import {
  ErrorState,
  LoadingState,
  notifyWarning,
  Screen,
  ScreenHeader,
  usePullToRefresh,
  useScrollFocusedInputIntoView,
} from '@/shared/ui';

import { DeleteAccountCard } from './components/DeleteAccountCard';
import { LogoutAllCard } from './components/LogoutAllCard';
import { PasswordCard } from './components/PasswordCard';
import { PersonalInfoCard } from './components/PersonalInfoCard';
import { PreferencesCard } from './components/PreferencesCard';
import { useAccountActions } from './hooks/useAccountActions';
import { useProfile } from './hooks/useProfile';

import type { UpdatePreferencesPayload } from '@omni/shared/users';

/**
 * Perfil: ruta de stack que se abre solo desde "Más". Cerrar sesión vive en "Más", no acá; acá está cerrarla en
 * todos los dispositivos.
 */
export function ProfileScreen() {
  const router = useRouter();
  const { profile, error, refresh, updateProfile, updatePreferences } = useProfile();
  const { changePassword, deleteAccount } = useAccountActions();
  const { logout, logoutAll } = useAuth();
  const { clearOverride } = useColorSchemeControl();
  const { scrollRef, onScroll, scrollIntoView } = useScrollFocusedInputIntoView();
  const refreshControl = usePullToRefresh(refresh);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more'));

  const savePreferences = async (payload: UpdatePreferencesPayload) => {
    await updatePreferences(payload);
    if (payload.theme) clearOverride();
  };

  const handleDelete = async () => {
    await deleteAccount();
    try {
      await logout();
    } catch {
      notifyWarning('Tu cuenta se eliminó, pero no se pudo cerrar la sesión. Cerrala desde "Más".');
    }
  };

  const renderBody = () => {
    const errorState = error ? (
      <ErrorState message="No se pudo cargar tu perfil" onRetry={() => void refresh()} />
    ) : null;

    if (!profile) return errorState ?? <LoadingState />;

    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.md, paddingBottom: SPACING.xl }}
        >
          {errorState}
          <PersonalInfoCard profile={profile} onSave={updateProfile} onFieldFocus={scrollIntoView} />
          <PreferencesCard
            values={{
              notifications: profile.preferences?.notifications ?? false,
              theme: profile.preferences?.theme ?? 'light',
            }}
            onChange={savePreferences}
          />
          <PasswordCard onSubmit={changePassword} onFieldFocus={scrollIntoView} />
          <LogoutAllCard onLogoutAll={logoutAll} />
          <DeleteAccountCard onDelete={handleDelete} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <Screen insetBottom>
      <ScreenHeader
        icon={UserIcon}
        title="Mi Perfil"
        subtitle="Gestiona tu información personal y preferencias"
        onBack={goBack}
      />
      <YStack flex={1}>{renderBody()}</YStack>
    </Screen>
  );
}
