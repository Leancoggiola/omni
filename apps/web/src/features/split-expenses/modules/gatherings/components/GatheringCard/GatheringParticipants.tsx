import { FC } from 'react';
import { Badge, Group, Text } from '@mantine/core';

import { MoneyAmount } from '../MoneyAmount';
import { GatheringSection } from './GatheringSection';

import type { GatheringParticipantSummary } from '@omni/shared/split-expenses';

interface GatheringParticipantsProps {
  participants: GatheringParticipantSummary[];
  fairShare: number;
}

export const GatheringParticipants: FC<GatheringParticipantsProps> = ({ participants, fairShare }) => (
  <GatheringSection label="Participantes">
    <Group gap="xs">
      {participants.map(participant => (
        <Badge key={participant.id} variant="light" color="brand" size="lg" radius="sm">
          <Text span fw={600} size="sm">
            {participant.displayName}
          </Text>{' '}
          <Text span c="dimmed" size="sm">
            <MoneyAmount value={participant.totalPaid} />
          </Text>
        </Badge>
      ))}
    </Group>
    <Text size="sm" c="dimmed">
      Parte equitativa: <MoneyAmount value={fairShare} /> c/u
    </Text>
  </GatheringSection>
);
