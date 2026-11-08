import { FC } from 'react';

import { UserAvatar } from '@/shared/ui';

import type { ParticipantTone } from '../utils/gatheringView';

interface ParticipantAvatarProps {
  name: string;
  tone: ParticipantTone | undefined;
  size?: string;
}

/** Avatar de un participante: el propio lleva el degradé de marca (`tone` indefinido) y el resto un tono suave. */
export const ParticipantAvatar: FC<ParticipantAvatarProps> = ({ name, tone, size = '2rem' }) => (
  <UserAvatar name={name} size={size} color={tone} />
);
