import { SPACING } from '@omni/shared/theme';
import { useRouter } from 'expo-router';
import { UserIcon } from 'phosphor-react-native';
import { KeyboardAvoidingView, ScrollView } from 'react-native';
import { YStack } from 'tamagui';

import { useAuth } from '@/core/auth';
import { useColorSchemeControl } from '@/core/theme';
import { ErrorState, LoadingState, Screen, ScreenHeader, useScrollFocusedInputIntoView } from '@/shared/ui';

import { DeleteAccountCard } from './components/DeleteAccountCard';
import { PasswordCard } from './components/PasswordCard';
import { PersonalInfoCard } from './components/PersonalInfoCard';
import { PreferencesCard } from './components/PreferencesCard';
import { useAccountActions, useProfile } from './hooks';

import type { UpdatePreferencesPayload } from '@omni/shared/users';

/** Perfil: ruta de stack que se abre solo desde "Más". Cerrar sesión vive en "Más", no acá. */
export function ProfileScreen() {
  const router = useRouter();
  const { profile, error, refresh, updateProfile, updatePreferences } = useProfile();
  const { changePassword, deleteAccount } = useAccountActions();
  const { logout } = useAuth();
  const { clearOverride } = useColorSchemeControl();
  const { scrollRef, onScroll, scrollIntoView } = useScrollFocusedInputIntoView();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more'));

  const savePreferences = async (payload: UpdatePreferencesPayload) => {
    await updatePreferences(payload);
    // Guardar el tema en el perfil descarta el override del toggle de "Más", igual que en web.
    if (payload.theme) clearOverride();
  };

  const handleDelete = async () => {
    await deleteAccount();
    await logout();
  };

  const renderBody = () => {
    // El error de SWR se muestra siempre (regla de oro 0); con datos en pantalla, una revalidación
    // fallida (p. ej. tras guardar una preferencia) no los reemplaza.
    if (!profile) {
      return error ? (
        <ErrorState message="No se pudo cargar tu perfil" onRetry={() => void refresh()} />
      ) : (
        <LoadingState />
      );
    }

    return (
      // Sin tab bar abajo: el contenido scrollea para llegar a las acciones con el teclado abierto.
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.md, paddingBottom: SPACING.xl }}
        >
          <PersonalInfoCard profile={profile} onSave={updateProfile} />
          <PreferencesCard
            values={{
              notifications: profile.preferences?.notifications ?? false,
              theme: profile.preferences?.theme ?? 'light',
            }}
            onChange={savePreferences}
          />
          <PasswordCard onSubmit={changePassword} onFieldFocus={scrollIntoView} />
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
