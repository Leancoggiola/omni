import { Avatar, type AvatarProps } from '@mantine/core';

import { GRADIENTS } from '@/theme/gradients';

import type { FC } from 'react';

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarProps['size'];
  color?: AvatarProps['color'];
}

/** Sin `color` es el avatar de marca (degradé); con `color` pasa a un tono suave, para distinguir usuarios en una lista. */
export const UserAvatar: FC<UserAvatarProps> = ({ name, src, size = 'md', color }) =>
  color ? (
    <Avatar src={src ?? undefined} size={size} name={name} variant="light" color={color} />
  ) : (
    <Avatar
      src={src ?? undefined}
      size={size}
      name={name}
      variant="gradient"
      gradient={GRADIENTS.brand}
      style={{ boxShadow: 'var(--mantine-shadow-brand)' }}
    />
  );
