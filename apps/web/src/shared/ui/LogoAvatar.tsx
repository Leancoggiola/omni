import { Avatar, type AvatarProps } from '@mantine/core';

import logoUrl from '@/assets/logo.png';

import type { FC } from 'react';

interface LogoAvatarProps {
  size?: AvatarProps['size'];
  bg?: string;
}

export const LogoAvatar: FC<LogoAvatarProps> = ({ size = 'md', bg = 'brand.2' }) => (
  <Avatar
    src={logoUrl}
    alt="Omni-logo"
    size={size}
    radius="lg"
    bg={bg}
    bd="1px solid var(--mantine-color-border-subtle)"
    styles={{ image: { objectFit: 'contain', padding: '5%' }, root: { boxShadow: 'var(--mantine-shadow-card)' } }}
  />
);
