import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { useAuth } from '@/core/auth';

import { UserAvatar } from './UserAvatar';

/** Avatar del `ScreenHeader` de las tabs: lleva a Perfil, que es una ruta de stack. */
export function ProfileAvatarButton() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.navigate('/profile')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Ir a mi perfil"
    >
      <UserAvatar name={user?.name ?? ''} />
    </Pressable>
  );
}
