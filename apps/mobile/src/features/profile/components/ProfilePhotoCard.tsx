import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import * as ImagePicker from 'expo-image-picker';
import { CameraIcon, TrashIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { Button, getErrorMessage, notifyError, notifySuccess, SectionCard, UserAvatar } from '@/shared/ui';

import { validateAvatarAsset } from '../utils/profilePhoto';

import type { UserProfile } from '@omni/shared/users';
import type { AvatarAsset } from '../utils/profilePhoto';

type ProfilePhotoCardProps = {
  profile: Pick<UserProfile, 'name' | 'avatarUrl'>;
  onUpload: (asset: AvatarAsset) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
};

/**
 * Foto de perfil: elige una imagen de la galería (JPG, PNG o WebP de hasta 2MB, como la API), la valida y la sube de
 * inmediato; "Quitar foto" la borra. Mientras hay un request en vuelo ambos botones quedan bloqueados. El selector del
 * sistema no necesita permisos de almacenamiento.
 */
export function ProfilePhotoCard({ profile, onUpload, onRemove }: ProfilePhotoCardProps) {
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const picking = useRef(false);

  const handlePick = async () => {
    if (picking.current) return;
    picking.current = true;
    try {
      let asset: AvatarAsset | undefined;
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: false,
        });
        asset = result.canceled ? undefined : result.assets[0];
      } catch (err) {
        notifyError(getErrorMessage(err, 'No se pudo abrir la galería'));
        return;
      }
      if (!asset) return;

      const error = validateAvatarAsset(asset);
      if (error) {
        notifyError(error);
        return;
      }
      setBusy('upload');
      try {
        await onUpload(asset);
        notifySuccess('Foto de perfil actualizada');
      } catch (err) {
        notifyError(getErrorMessage(err, 'No se pudo subir la foto'));
      } finally {
        setBusy(null);
      }
    } finally {
      picking.current = false;
    }
  };

  const handleRemove = async () => {
    setBusy('remove');
    try {
      await onRemove();
      notifySuccess('Foto de perfil eliminada');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo quitar la foto'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SectionCard title="Foto de perfil" subtitle="Actualizá tu foto de perfil">
      <XStack alignItems="center" gap={SPACING.lg}>
        <UserAvatar name={profile.name} size={80} uri={profile.avatarUrl} />
        <YStack flex={1} gap={SPACING.xs}>
          <Button
            variant="light"
            leftSection={CameraIcon}
            loading={busy === 'upload'}
            disabled={busy !== null}
            onPress={() => void handlePick()}
          >
            Cambiar foto
          </Button>
          {profile.avatarUrl ? (
            <Button
              variant="outline"
              color="destructive"
              leftSection={TrashIcon}
              loading={busy === 'remove'}
              disabled={busy !== null}
              onPress={() => void handleRemove()}
            >
              Quitar foto
            </Button>
          ) : null}
          <Paragraph color="$dimmed" fontSize={FONT_SIZE.xs}>
            JPG, PNG o WebP (máx. 2MB)
          </Paragraph>
        </YStack>
      </XStack>
    </SectionCard>
  );
}
