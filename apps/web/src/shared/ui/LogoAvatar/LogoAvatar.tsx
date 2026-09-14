import { Avatar } from '@mantine/core';

import logoUrl from '@/assets/logo.png';

import type { MantineSize } from '@mantine/core';
import type { FC } from 'react';

interface LogoAvatarProps {
  size?: MantineSize | number;
  bg?: string;
}

export const LogoAvatar: FC<LogoAvatarProps> = ({ size = 'md', bg = 'brand.2' }) => (
  <Avatar
    src={logoUrl}
    alt="Omni-logo"
    size={size}
    radius="lg"
    bg={bg}
    bd="1px solid var(--mantine-color-brand-9)"
    styles={{ image: { objectFit: 'contain', padding: '5%' }, root: { boxShadow: 'var(--mantine-shadow-md)' } }}
  />
);
