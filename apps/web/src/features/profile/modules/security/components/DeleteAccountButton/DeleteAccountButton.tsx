import { FC, useState } from 'react';
import { Button, Group, Paper, Stack, Text } from '@mantine/core';

import { confirm, getErrorMessage, notifyError } from '@/shared/ui';

interface DeleteAccountButtonProps {
  onDelete: () => Promise<void>;
}

export const DeleteAccountButton: FC<DeleteAccountButtonProps> = ({ onDelete }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const confirmed = await confirm({
      title: 'Eliminar cuenta',
      description:
        '¿Seguro que querés eliminar tu cuenta? Esta acción no se puede deshacer. Se borrarán todos tus datos de forma permanente.',
      confirmLabel: 'Sí, eliminar mi cuenta',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await onDelete();
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo eliminar la cuenta'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper>
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Stack gap="3xs">
          <Text fw={600}>¿Eliminar tu cuenta?</Text>
          <Text c="dimmed" size="sm">
            Se borran todos tus datos de forma permanente. Esta acción no se puede deshacer.
          </Text>
        </Stack>
        <Button color="destructive" loading={loading} onClick={handleClick}>
          Eliminar cuenta
        </Button>
      </Group>
    </Paper>
  );
};
