import { FC } from 'react';
import { Group, Paper, Stack, Text } from '@mantine/core';

import { MoneyAmount } from '../MoneyAmount';
import { GatheringSection } from './GatheringSection';

import type { Settlement } from '@omni/shared/split-expenses';

import { ArrowRightIcon } from '@phosphor-icons/react';

interface GatheringSettlementsProps {
  settlements: Settlement[];
}

export const GatheringSettlements: FC<GatheringSettlementsProps> = ({ settlements }) => (
  <GatheringSection label="¿Quién le debe a quién?">
    <Stack gap="3xs">
      {settlements.map(settlement => (
        <Paper
          key={`${settlement.fromParticipantId}-${settlement.toParticipantId}`}
          p="sm"
          radius="sm"
          bg="var(--mantine-color-brand-light)"
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" align="center" wrap="nowrap">
              <Text size="sm" fw={600}>
                {settlement.fromName}
              </Text>
              <ArrowRightIcon size="1rem" />
              <Text size="sm" fw={600}>
                {settlement.toName}
              </Text>
            </Group>
            <Text size="sm" fw={700}>
              <MoneyAmount value={settlement.amount} />
            </Text>
          </Group>
        </Paper>
      ))}
    </Stack>
  </GatheringSection>
);
