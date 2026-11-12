import { Button, FileButton, Group, Stack, Text } from '@mantine/core';

import { getErrorMessage, notifyError, notifySuccess, UserAvatar } from '@/shared/ui';

import { ProfileSectionCard } from './ProfileSectionCard';

import type { FC } from 'react';

import { AVATAR_ALLOWED_MIME, AVATAR_MAX_BYTES, isAvatarMime } from '@omni/shared/users';
import { CameraIcon, TrashIcon } from '@phosphor-icons/react';

const ACCEPTED_AVATAR_TYPES = AVATAR_ALLOWED_MIME.join(',');
const MAX_AVATAR_MB = AVATAR_MAX_BYTES / (1024 * 1024);

interface ProfilePhotoSectionProps {
  name: string;
  avatarUrl: string | null;
  isBusy: boolean;
  onUpload: (file: File) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
}

/**
 * Cambio y borrado de la foto de perfil. Valida tipo y peso con las mismas constantes que la API (`@omni/shared/users`)
 * antes de subir; el resultado, bueno o malo, se avisa con `notifySuccess` / `notifyError`.
 */
export const ProfilePhotoSection: FC<ProfilePhotoSectionProps> = ({ name, avatarUrl, isBusy, onUpload, onRemove }) => {
  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      notifySuccess(success);
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo actualizar la foto de perfil'));
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (!isAvatarMime(file.type)) return notifyError('Formato no admitido: usá JPG, PNG o WebP');
    if (file.size > AVATAR_MAX_BYTES) return notifyError(`La foto no puede pesar más de ${MAX_AVATAR_MB} MB`);
    void run(() => onUpload(file), 'Foto de perfil actualizada');
  };

  return (
    <ProfileSectionCard title="Foto de perfil" subtitle="Actualizá tu foto de perfil">
      <Group wrap="nowrap" align="center" gap="lg">
        <UserAvatar name={name} src={avatarUrl} size="5rem" />
        <Stack gap="xs" align="flex-start">
          <Group gap="xs">
            <FileButton accept={ACCEPTED_AVATAR_TYPES} onChange={handleFileChange} disabled={isBusy}>
              {props => (
                <Button
                  {...props}
                  variant="default"
                  size="xs"
                  loading={isBusy}
                  leftSection={<CameraIcon size="1rem" aria-hidden />}
                >
                  Cambiar foto
                </Button>
              )}
            </FileButton>
            {avatarUrl && (
              <Button
                variant="subtle"
                size="xs"
                disabled={isBusy}
                leftSection={<TrashIcon size="1rem" aria-hidden />}
                onClick={() => void run(onRemove, 'Foto de perfil eliminada')}
              >
                Quitar foto
              </Button>
            )}
          </Group>
          <Text c="dimmed" size="xs">
            JPG, PNG o WebP (máx. {MAX_AVATAR_MB} MB)
          </Text>
        </Stack>
      </Group>
    </ProfileSectionCard>
  );
};
