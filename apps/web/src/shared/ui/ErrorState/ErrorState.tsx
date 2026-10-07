import { FC } from 'react';
import { Alert, Button, Text } from '@mantine/core';

import { WarningCircleIcon } from '@phosphor-icons/react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: FC<ErrorStateProps> = ({ message = 'No se pudieron cargar los datos', onRetry }) => (
  <Alert color="destructive" title={<Text size="sm">{message}</Text>} icon={<WarningCircleIcon size="1.25rem" />}>
    {onRetry && (
      <Button size="xs" variant="light" color="destructive" onClick={onRetry} mt="md">
        Reintentar
      </Button>
    )}
  </Alert>
);
