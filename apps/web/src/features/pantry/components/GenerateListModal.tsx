import { FC, useState } from 'react';
import { Alert, Badge, Button, Group, Modal, Stack, Text } from '@mantine/core';

import { getErrorMessage } from '@/shared/ui';

import { CategoryTile } from './CategoryTile';

import type { GeneratePreviewRow } from '../utils/shoppingList';

import { formatPantryQuantity } from '@omni/shared/pantry';

interface GenerateListModalProps {
  opened: boolean;
  onClose: () => void;
  rows: GeneratePreviewRow[];
  onConfirm: () => Promise<void>;
}

/** Vista previa de "Generar desde bajo stock": qué se suma o se actualiza antes de tocar la lista. */
export const GenerateListModal: FC<GenerateListModalProps> = ({ opened, onClose, rows, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo generar la lista'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Generar desde bajo stock"
      centered
      closeOnClickOutside={!loading}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Se suman los productos que están en su mínimo o por debajo. Si ya estaban en la lista, se actualiza la
          cantidad.
        </Text>
        {error && <Alert color="destructive">{error}</Alert>}
        <Stack gap="sm">
          {rows.map(({ product, quantityToBuy, alreadyListed }) => (
            <Group key={product.id} gap="sm" wrap="nowrap" justify="space-between">
              <Group gap="sm" wrap="nowrap" miw={0}>
                <CategoryTile category={product.category} isLowStock />
                <div>
                  <Text fw={600}>{product.name}</Text>
                  <Text size="xs" c="dimmed">
                    En alacena: {formatPantryQuantity(product.quantity, product.unit)} · mínimo {product.minQuantity}
                  </Text>
                </div>
              </Group>
              <Stack gap="3xs" align="flex-end">
                <Badge size="sm" variant="light" color={alreadyListed ? 'gray' : 'terracotta'}>
                  {alreadyListed ? 'Ya en la lista' : 'Nuevo'}
                </Badge>
                <Text size="sm" fw={600}>
                  Comprar {formatPantryQuantity(quantityToBuy, product.unit)}
                </Text>
              </Stack>
            </Group>
          ))}
        </Stack>
        <Group justify="flex-end" gap="sm">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button loading={loading} disabled={rows.length === 0} onClick={() => void handleConfirm()}>
            Generar lista
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
