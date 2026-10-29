import { useState } from 'react';
import { FileButton, Group, Stack, Text, UnstyledButton } from '@mantine/core';

import { UserAvatar } from '@/shared/ui';

import { ProfileSectionCard } from './ProfileSectionCard';

import type { FC } from 'react';

import { CameraIcon } from '@phosphor-icons/react';

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = 'image/jpeg,image/png,image/gif';

interface ProfilePhotoSectionProps {
  name: string;
  avatarUrl: string | null;
}

/**
 * Cambio de foto de perfil. Oculta (no se renderiza en `ProfilePage`) hasta que exista el endpoint de avatar (#39):
 * hoy solo muestra una vista previa local que no se guarda.
 */
export const ProfilePhotoSection: FC<ProfilePhotoSectionProps> = ({ name, avatarUrl }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|gif)$/)) return;
    if (file.size > MAX_AVATAR_SIZE_BYTES) return;

    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  return (
    <ProfileSectionCard title="Foto de Perfil" subtitle="Actualizá tu foto de perfil">
      <Group wrap="nowrap" align="center" gap="lg">
        <UserAvatar name={name} src={previewUrl ?? avatarUrl} size="5rem" />
        <Stack gap="2xs">
          <FileButton accept={ACCEPTED_AVATAR_TYPES} onChange={handleFileChange}>
            {props => (
              <UnstyledButton {...props} c="var(--mantine-color-text-primary)" fz="sm" fw={500}>
                <Group gap="xs" wrap="nowrap">
                  <CameraIcon size="1rem" aria-hidden />
                  Cambiar foto
                </Group>
              </UnstyledButton>
            )}
          </FileButton>
          <Text c="dimmed" size="xs">
            JPG, PNG o GIF (máx. 5MB)
          </Text>
        </Stack>
      </Group>
    </ProfileSectionCard>
  );
};
