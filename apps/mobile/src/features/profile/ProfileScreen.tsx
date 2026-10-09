import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { SPACING } from '@omni/shared/theme';
import { UserIcon } from 'phosphor-react-native';
import { Button, Input, Paragraph, Switch, XStack, YStack } from 'tamagui';

import { useAuth } from '@/core/auth';
import { useColorSchemeControl } from '@/core/theme';
import { Screen, ScreenHeader, Spinner } from '@/shared/ui';

import { useAccountActions, useProfile } from './hooks';

import { PROFILE_THEME_OPTIONS } from '@omni/shared/users';

import type { ProfileTheme } from '@omni/shared/users';

export function ProfileScreen() {
  const { profile, isLoading, updateProfile, updatePreferences } = useProfile();
  const { changePassword, deleteAccount } = useAccountActions();
  const { logout } = useAuth();
  const { clearOverride } = useColorSchemeControl();

  const [phone, setPhone] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (isLoading || !profile) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner />
      </YStack>
    );
  }

  const phoneValue = phone ?? profile.phone ?? '';

  const onSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ phone: phoneValue || null });
      Alert.alert('Guardado', 'Perfil actualizado');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const onToggleNotifications = async (value: boolean) => {
    try {
      await updatePreferences({ notifications: value });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  };

  const onChangeTheme = async (theme: ProfileTheme) => {
    // Un PATCH a la vez: dos en vuelo podrían resolver en otro orden y dejar el tema equivocado.
    if (savingTheme) return;
    setSavingTheme(true);
    try {
      await updatePreferences({ theme });
      // Guardar el tema en el perfil descarta el override del toggle, igual que en web.
      clearOverride();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setSavingTheme(false);
    }
  };

  const onChangePassword = async () => {
    if (password.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }
    try {
      await changePassword(password);
      setPassword('');
      Alert.alert('Listo', 'Contraseña actualizada');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cambiar');
    }
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      // En el camino exitoso la sesión se limpia y esta pantalla se desmonta: solo se reactiva el botón si falló.
      setLoggingOut(false);
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cerrar la sesión');
    }
  };

  const onDelete = () => {
    Alert.alert('¿Eliminar cuenta?', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteAccount();
            await logout();
          })();
        },
      },
    ]);
  };

  return (
    <Screen insetTop={false} insetBottom>
      <ScreenHeader icon={UserIcon} title="Mi Perfil" subtitle="Gestiona tu información personal y preferencias" />
      {/* Sin tab bar abajo: el contenido scrollea para llegar a las acciones con el teclado abierto. */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: SPACING.md, paddingBottom: SPACING.xl }}
      >
        <Paragraph theme="alt1">
          {profile.name} (@{profile.username})
        </Paragraph>

        <YStack gap="$2">
          <Paragraph fontWeight="600">Teléfono</Paragraph>
          <Input value={phoneValue} onChangeText={setPhone} placeholder="Teléfono" />
          <Button disabled={saving} onPress={() => void onSaveProfile()}>
            {saving ? <Spinner color="$color" /> : 'Guardar perfil'}
          </Button>
        </YStack>

        <XStack alignItems="center" justifyContent="space-between">
          <Paragraph>Notificaciones</Paragraph>
          <Switch
            checked={profile.preferences?.notifications ?? false}
            onCheckedChange={checked => void onToggleNotifications(!!checked)}
          >
            <Switch.Thumb />
          </Switch>
        </XStack>

        <YStack gap="$2">
          <Paragraph fontWeight="600">Tema</Paragraph>
          <XStack gap="$2" accessibilityRole="radiogroup" accessibilityLabel="Tema">
            {PROFILE_THEME_OPTIONS.map(option => {
              const selected = (profile.preferences?.theme ?? 'light') === option.value;
              return (
                <Button
                  key={option.value}
                  flex={1}
                  borderWidth={1}
                  borderColor={selected ? '$primary' : '$borderColor'}
                  backgroundColor={selected ? '$primary' : 'transparent'}
                  color={selected ? '$background' : '$color'}
                  pressStyle={{ opacity: 0.8 }}
                  disabled={savingTheme}
                  onPress={() => void onChangeTheme(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: savingTheme }}
                >
                  {option.label}
                </Button>
              );
            })}
          </XStack>
        </YStack>

        <YStack gap="$2">
          <Paragraph fontWeight="600">Cambiar contraseña</Paragraph>
          <Input secureTextEntry value={password} onChangeText={setPassword} placeholder="Nueva contraseña" />
          <Button onPress={() => void onChangePassword()}>Actualizar contraseña</Button>
        </YStack>

        <Button theme="red" onPress={onDelete}>
          Eliminar cuenta
        </Button>

        <Button chromeless disabled={loggingOut} onPress={() => void onLogout()}>
          {loggingOut ? <Spinner /> : 'Cerrar sesión'}
        </Button>
      </ScrollView>
    </Screen>
  );
}
