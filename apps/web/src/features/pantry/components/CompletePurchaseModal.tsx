import { FC, useState } from 'react';
import { Alert, Button, Group, Modal, NumberInput, Select, Stack, Text } from '@mantine/core';

import { getErrorMessage } from '@/shared/ui';

import type { CompleteShoppingListItemPayload, PantryCategory, PantryShoppingListItem } from '@omni/shared/pantry';

import { PANTRY_CATEGORIES, PANTRY_CATEGORY_LABELS } from '@omni/shared/pantry';

const CATEGORY_OPTIONS = PANTRY_CATEGORIES.map(value => ({ value, label: PANTRY_CATEGORY_LABELS[value] }));

interface CompletePurchaseModalProps {
  item: PantryShoppingListItem | null;
  onClose: () => void;
  onConfirm: (item: PantryShoppingListItem, payload: CompleteShoppingListItemPayload) => Promise<void>;
}

interface CompletePurchaseFormProps {
  item: PantryShoppingListItem;
  loading: boolean;
  onSubmit: (payload: CompleteShoppingListItemPayload) => Promise<void>;
  onCancel: () => void;
}

/**
 * Cantidad comprada y, si el ítem no está vinculado a un producto, la categoría donde guardarlo (la API la exige para
 * productos nuevos). "Marcar como comprado" queda deshabilitado hasta que los datos son válidos.
 */
const CompletePurchaseForm: FC<CompletePurchaseFormProps> = ({ item, loading, onSubmit, onCancel }) => {
  const needsCategory = item.pantryProductId === null;
  const [quantity, setQuantity] = useState<number | string>(item.quantityToBuy);
  const [category, setCategory] = useState<PantryCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quantityValue = Number(quantity);
  const valid = quantity !== '' && quantityValue > 0 && (!needsCategory || category !== null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || loading) return;
    setError(null);
    try {
      await onSubmit({ quantityPurchased: quantityValue, ...(needsCategory && category ? { category } : {}) });
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo marcar como comprado'));
    }
  };

  return (
    <form noValidate onSubmit={event => void handleSubmit(event)}>
      <Stack gap="md">
        {error && <Alert color="destructive">{error}</Alert>}
        <NumberInput
          label="Cantidad comprada"
          withAsterisk
          min={1}
          allowNegative={false}
          value={quantity}
          onChange={setQuantity}
          data-autofocus
        />
        {needsCategory && (
          <Select
            label="Categoría"
            withAsterisk
            placeholder="Elegí una categoría"
            data={CATEGORY_OPTIONS}
            value={category}
            onChange={value => setCategory(value as PantryCategory | null)}
            description="Es un producto nuevo: elegí dónde guardarlo en tu alacena."
          />
        )}
        <Group justify="flex-end" gap="sm">
          <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" color="success" loading={loading} disabled={!valid}>
            Marcar como comprado
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

/** Modal "Marcar como comprado" de un ítem de la lista que todavía no está en la alacena. */
export const CompletePurchaseModal: FC<CompletePurchaseModalProps> = ({ item, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleSubmit = async (payload: CompleteShoppingListItemPayload) => {
    if (!item) return;
    setLoading(true);
    try {
      await onConfirm(item, payload);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={item !== null}
      onClose={handleClose}
      title="Marcar como comprado"
      centered
      closeOnClickOutside={!loading}
    >
      {item && (
        <Stack gap="md">
          <Text c="dimmed" size="sm">
            {item.name}
          </Text>
          <CompletePurchaseForm item={item} loading={loading} onSubmit={handleSubmit} onCancel={handleClose} />
        </Stack>
      )}
    </Modal>
  );
};
