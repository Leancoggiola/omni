import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import * as ImagePicker from 'expo-image-picker';
import { CameraIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { Button, getErrorMessage, notifyError, SectionCard, UserAvatar } from '@/shared/ui';

import { validateAvatarAsset } from '../utils/profilePhoto';

import type { UserProfile } from '@omni/shared/users';

type ProfilePhotoCardProps = {
  profile: Pick<UserProfile, 'name' | 'avatarUrl'>;
};

/**
 * Foto de perfil: elige una imagen de la galería (JPG, PNG o GIF de hasta 5MB) y la muestra como vista previa local,
 * igual que `ProfilePhotoSection` de web. No se sube: falta el endpoint de avatar (#39).
 */
export function ProfilePhotoCard({ profile }: ProfilePhotoCardProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const picking = useRef(false);

  const handlePick = async () => {
    if (picking.current) return;
    picking.current = true;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
      });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;

      const error = validateAvatarAsset(asset);
      if (error) {
        notifyError(error);
        return;
      }
      setPreviewUri(asset.uri);
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo abrir la galería'));
    } finally {
      picking.current = false;
    }
  };

  return (
    <SectionCard title="Foto de perfil" subtitle="Actualizá tu foto de perfil">
      <XStack alignItems="center" gap={SPACING.lg}>
        <UserAvatar name={profile.name} size={80} uri={previewUri ?? profile.avatarUrl} />
        <YStack flex={1} gap={SPACING['2xs']}>
          <Button leftSection={CameraIcon} onPress={() => void handlePick()}>
            Cambiar foto
          </Button>
          <Paragraph color="$dimmed" fontSize={FONT_SIZE.xs}>
            JPG, PNG o GIF (máx. 5MB)
          </Paragraph>
        </YStack>
      </XStack>
    </SectionCard>
  );
}
