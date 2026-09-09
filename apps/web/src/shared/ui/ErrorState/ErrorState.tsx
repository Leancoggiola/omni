import { FC } from 'react';
import { Alert, Button, Group, Text } from '@mantine/core';

import { WarningCircleIcon } from '@phosphor-icons/react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: FC<ErrorStateProps> = ({ message = 'No se pudieron cargar los datos', onRetry }) => (
  <Alert color="destructive" variant="light" icon={<WarningCircleIcon size="1.1rem" />}>
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Text size="sm">{message}</Text>
      {onRetry && (
        <Button size="xs" variant="light" color="destructive" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </Group>
  </Alert>
);
