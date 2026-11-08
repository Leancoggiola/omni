import { FC } from 'react';
import { Box, Group, Text } from '@mantine/core';

import { PANTRY_LIST_REFRESH_MS } from '@omni/shared/pantry';

/** Avisa que la lista compartida se refresca sola, sin depender de que la otra persona avise. */
export const PantryLiveIndicator: FC = () => (
  <Group gap="xs" wrap="nowrap" role="status">
    <Box w="0.5rem" h="0.5rem" bg="success" style={{ borderRadius: '50%' }} aria-hidden />
    <Text size="xs" c="dimmed">
      Se actualiza solo cada {PANTRY_LIST_REFRESH_MS / 1000} s
    </Text>
  </Group>
);
