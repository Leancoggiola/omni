import { FC, useState } from 'react';
import { Alert, Button, Text } from '@mantine/core';

import { WarningCircleIcon } from '@phosphor-icons/react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void | Promise<unknown>;
}

/**
 * Alerta de error de carga. Si `onRetry` devuelve una promesa, el botón queda en `loading` hasta que se resuelve:
 * con la API despertando (cold start) el reintento puede tardar y sin eso parece que el clic no hizo nada.
 */
export const ErrorState: FC<ErrorStateProps> = ({ message = 'No se pudieron cargar los datos', onRetry }) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Alert
      color="destructive"
      radius="xl"
      title={<Text size="sm">{message}</Text>}
      icon={<WarningCircleIcon size="1.25rem" />}
    >
      {onRetry && (
        <Button size="xs" variant="default" loading={retrying} onClick={() => void handleRetry()} mt="md">
          Reintentar
        </Button>
      )}
    </Alert>
  );
};
