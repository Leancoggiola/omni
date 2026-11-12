import { SPACING } from '@omni/shared/theme';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, ScrollView } from 'react-native';
import { YStack } from 'tamagui';

import { LocalSessionClearError, useAuth } from '@/core/auth';
import { useHousehold } from '@/core/household';
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
import { HouseholdCard } from './components/HouseholdCard';
import { LogoutAllCard } from './components/LogoutAllCard';
import { PasswordCard } from './components/PasswordCard';
import { PersonalInfoCard } from './components/PersonalInfoCard';
import { PreferencesCard } from './components/PreferencesCard';
import { ProfilePhotoCard } from './components/ProfilePhotoCard';
import { useAccountActions } from './hooks/useAccountActions';
import { useProfile } from './hooks/useProfile';

import type { UpdatePreferencesPayload } from '@omni/shared/users';

/**
 * Perfil: ruta de stack que se abre solo desde "Más". Cerrar sesión vive en "Más", no acá; acá está cerrarla en
 * todos los dispositivos.
 */
export function ProfileScreen() {
  const router = useRouter();
  const { profile, error, refresh, updateProfile, updatePreferences, uploadAvatar, removeAvatar } = useProfile();
  const { changePassword, deleteAccount } = useAccountActions();
  const { logout, logoutAll } = useAuth();
  const { clearOverride } = useColorSchemeControl();
  const { scrollRef, onScroll, scrollIntoView } = useScrollFocusedInputIntoView();
  const { mutate: refreshHousehold } = useHousehold();
  const refreshControl = usePullToRefresh(async () => {
    await Promise.all([refresh(), refreshHousehold()]);
  });

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more'));

  /**
   * Envuelve una acción de foto: al terminar bien refresca el hogar (donde también se ve el avatar). Ese refresco no
   * hace fallar la acción, porque la foto ya se guardó.
   */
  const changeAvatar =
    <A extends unknown[]>(action: (...args: A) => Promise<unknown>) =>
    async (...args: A) => {
      await action(...args);
      void Promise.resolve(refreshHousehold()).catch(() => undefined);
    };

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

  const handleLogoutAll = async () => {
    try {
      await logoutAll();
    } catch (error) {
      if (!(error instanceof LocalSessionClearError)) throw error;
      notifyWarning(
        'Se cerraron las sesiones en todos los dispositivos, pero no se pudieron borrar los datos de este celular.'
      );
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
          <ProfilePhotoCard
            profile={profile}
            onUpload={changeAvatar(uploadAvatar)}
            onRemove={changeAvatar(removeAvatar)}
          />
          <PersonalInfoCard profile={profile} onSave={updateProfile} onFieldFocus={scrollIntoView} />
          <PreferencesCard
            values={{
              notifications: profile.preferences?.notifications ?? false,
              theme: profile.preferences?.theme ?? 'light',
            }}
            onChange={savePreferences}
          />
          <HouseholdCard />
          <PasswordCard onSubmit={changePassword} onFieldFocus={scrollIntoView} />
          <LogoutAllCard onLogoutAll={handleLogoutAll} />
          <DeleteAccountCard onDelete={handleDelete} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <Screen insetBottom>
      <ScreenHeader
        title="Mi perfil"
        subtitle="Gestioná tu información personal y preferencias"
        size="lg"
        onBack={goBack}
        backLabel="Volver a Más"
      />
      <YStack flex={1}>{renderBody()}</YStack>
    </Screen>
  );
}
