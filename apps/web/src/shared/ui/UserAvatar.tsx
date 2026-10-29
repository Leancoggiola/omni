import { Avatar, type AvatarProps } from '@mantine/core';

import { GRADIENTS } from '@/theme/gradients';

import type { FC } from 'react';

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarProps['size'];
}

export const UserAvatar: FC<UserAvatarProps> = ({ name, src, size = 'md' }) => (
  <Avatar
    src={src ?? undefined}
    size={size}
    name={name}
    variant="gradient"
    gradient={GRADIENTS.brand}
    style={{ boxShadow: 'var(--mantine-shadow-brand)' }}
  />
);
