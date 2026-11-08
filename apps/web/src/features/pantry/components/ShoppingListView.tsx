import { FC, useState } from 'react';
import { Button, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Paper } from '@mantine/core';

import { useHousehold } from '@/core/household';
import {
  confirm,
  EmptyState,
  ErrorState,
  getErrorMessage,
  LoadingState,
  notifyError,
  notifySuccess,
} from '@/shared/ui';

import { usePantryProducts } from '../hooks/usePantryProducts';
import { usePantrySummary } from '../hooks/usePantrySummary';
import { useShoppingList } from '../hooks/useShoppingList';
import { useShoppingListMutations } from '../hooks/useShoppingListMutations';
import { AddShoppingItemForm } from './AddShoppingItemForm';
import { CompletePurchaseModal } from './CompletePurchaseModal';
import { EditShoppingItemModal } from './EditShoppingItemModal';
import { GenerateBanner } from './GenerateBanner';
import { GenerateListModal } from './GenerateListModal';
import { ShoppingItemRow } from './ShoppingItemRow';

import type { PantryShoppingListItem } from '@omni/shared/pantry';

import { buildGeneratePreview, splitShoppingList } from '@omni/shared/pantry';
import { ShoppingCartIcon } from '@phosphor-icons/react';

/**
 * Pestaña de la lista de compras: banner de bajo stock, alta manual y las columnas Por comprar / Comprados. Marcar
 * un ítem vinculado a un producto lo compra al instante; uno libre pide cantidad y categoría en un modal. El error de
 * carga se muestra con reintento, nunca como lista vacía.
 */
export const ShoppingListView: FC = () => {
  const [generateOpened, setGenerateOpened] = useState(false);
  const [completing, setCompleting] = useState<PantryShoppingListItem | null>(null);
  const [editing, setEditing] = useState<PantryShoppingListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { items, isLoading, error, mutate: retryList } = useShoppingList();
  const { summary } = usePantrySummary();
  const { products } = usePantryProducts();
  const { household } = useHousehold();
  const { generate, addItem, completeItem, updateItem, uncheckItem, removeItem, clearChecked } =
    useShoppingListMutations();
  const showAuthor = (household?.members.length ?? 0) > 1;

  const runItemAction = async (id: string, action: () => Promise<unknown>, fallback: string, success?: string) => {
    setBusyId(id);
    try {
      await action();
      if (success) notifySuccess(success);
    } catch (err) {
      notifyError(getErrorMessage(err, fallback));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = (item: PantryShoppingListItem) => {
    if (item.checked) {
      void runItemAction(item.id, () => uncheckItem(item.id), 'No se pudo destildar el ítem');
    } else if (item.pantryProductId) {
      void runItemAction(
        item.id,
        () => completeItem(item.id),
        'No se pudo marcar como comprado',
        'Marcado como comprado'
      );
    } else {
      setCompleting(item);
    }
  };

  const handleRemove = async (item: PantryShoppingListItem) => {
    const confirmed = await confirm({
      title: `¿Quitar ${item.name}?`,
      description: 'Se saca de la lista de compras. No cambia tu alacena.',
      confirmLabel: 'Quitar',
    });
    if (confirmed) await runItemAction(item.id, () => removeItem(item.id), 'No se pudo quitar el ítem');
  };

  const handleClearChecked = async () => {
    try {
      await clearChecked();
      notifySuccess('Comprados limpiados');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudieron limpiar los comprados'));
    }
  };

  if (error) return <ErrorState message="No se pudo cargar tu lista de compras" onRetry={() => retryList()} />;
  if (isLoading || !items) return <LoadingState variant="skeleton" rows={4} />;

  const { pending, done } = splitShoppingList(items);

  return (
    <Stack gap="lg">
      {summary && summary.lowStockCount > 0 && (
        <GenerateBanner lowStockCount={summary.lowStockCount} onGenerate={() => setGenerateOpened(true)} />
      )}

      <AddShoppingItemForm
        onAdd={async payload => {
          await addItem(payload);
          notifySuccess('Agregado a la lista');
        }}
      />

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Paper p="md" component="section" aria-labelledby="shopping-pending">
          <Title order={2} size="h4" id="shopping-pending" mb="xs">
            Por comprar
          </Title>
          {pending.length === 0 ? (
            <EmptyState icon={<ShoppingCartIcon />} title="Tu lista está vacía" />
          ) : (
            pending.map(item => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                showAuthor={showAuthor}
                busy={busyId === item.id}
                onToggle={handleToggle}
                onEdit={setEditing}
                onRemove={handleRemove}
              />
            ))
          )}
        </Paper>

        <Paper p="md" component="section" aria-labelledby="shopping-done">
          <Group justify="space-between" mb="xs">
            <Title order={2} size="h4" id="shopping-done">
              Comprados
            </Title>
            {done.length > 0 && (
              <Button variant="subtle" size="xs" onClick={() => void handleClearChecked()}>
                Limpiar comprados
              </Button>
            )}
          </Group>
          {done.length === 0 ? (
            <Text size="sm" c="dimmed">
              Lo que tildes como comprado aparece acá y se suma a tu alacena.
            </Text>
          ) : (
            done.map(item => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                showAuthor={showAuthor}
                busy={busyId === item.id}
                onToggle={handleToggle}
              />
            ))
          )}
        </Paper>
      </SimpleGrid>

      <GenerateListModal
        opened={generateOpened}
        onClose={() => setGenerateOpened(false)}
        rows={buildGeneratePreview(products ?? [], items)}
        onConfirm={async () => {
          await generate();
          notifySuccess('Lista generada');
        }}
      />
      <CompletePurchaseModal
        item={completing}
        onClose={() => setCompleting(null)}
        onConfirm={async (item, payload) => {
          await completeItem(item.id, payload);
          notifySuccess('Marcado como comprado');
        }}
      />
      <EditShoppingItemModal
        item={editing}
        onClose={() => setEditing(null)}
        onSave={async (item, quantityToBuy) => {
          await updateItem(item.id, quantityToBuy);
          notifySuccess('Ítem actualizado');
        }}
      />
    </Stack>
  );
};
