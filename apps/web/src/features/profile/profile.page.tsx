import { FC, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack } from '@mantine/core';

import { useAuth } from '@/core/auth';
import { ErrorState, LoadingState, PageHeader } from '@/shared/ui';

import {
  DeleteAccountButton,
  PasswordForm,
  ProfileSectionCard,
  ProfileSettingsForm,
  useAccountActions,
  useProfile,
} from './modules';

import type { ChangePasswordPayload } from '@omni/shared/users';

import { UserIcon } from '@phosphor-icons/react';

export const ProfilePage: FC = () => {
  const { profile, isLoading, isMutating, error, mutate, updateProfile, updatePreferences } = useProfile();
  const { changePassword, deleteAccount } = useAccountActions();
  const { clearSession } = useAuth();
  const navigate = useNavigate();

  const handleChangePassword = useCallback(
    async (payload: ChangePasswordPayload) => {
      await changePassword(payload);
    },
    [changePassword]
  );

  /**
   * El DELETE ya borra las cookies: llamar a `/logout` sin sesión daría 401. Si falla, la sesión local no se toca
   * y el error lo muestra `DeleteAccountButton`.
   */
  const handleDeleteAccount = useCallback(async () => {
    await deleteAccount();
    await clearSession();
    navigate('/login', { replace: true });
  }, [deleteAccount, clearSession, navigate]);

  const handleSave = useCallback(
    async ({
      profile: profileUpdates,
      preferences: preferencesUpdates,
    }: {
      profile: Parameters<typeof updateProfile>[0];
      preferences: Parameters<typeof updatePreferences>[0];
      theme: 'light' | 'dark' | 'auto';
    }) => {
      const tasks: Promise<unknown>[] = [];

      if (Object.keys(profileUpdates).length > 0) {
        tasks.push(updateProfile(profileUpdates));
      }
      if (Object.keys(preferencesUpdates).length > 0) {
        tasks.push(updatePreferences(preferencesUpdates));
      }

      await Promise.all(tasks);
    },
    [updateProfile, updatePreferences]
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message="No se pudo cargar tu perfil" onRetry={() => mutate()} />;
  }

  if (!profile) {
    return null;
  }

  return (
    <Stack gap="xl">
      <PageHeader
        icon={<UserIcon size="1.5rem" />}
        title="Mi Perfil"
        subtitle="Gestioná tu información personal y preferencias"
      />

      <ProfileSettingsForm key={profile.updatedAt} profile={profile} isSaving={isMutating} onSave={handleSave} />

      <ProfileSectionCard title="Cambiar contraseña" subtitle="Actualizá la contraseña de tu cuenta">
        <PasswordForm onSubmit={handleChangePassword} />
      </ProfileSectionCard>

      <DeleteAccountButton onDelete={handleDeleteAccount} />
    </Stack>
  );
};
