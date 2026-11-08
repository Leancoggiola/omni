// tamagui-ignore
import { buildGeneratePreview, splitShoppingList } from '@omni/shared/pantry';
import { SPACING } from '@omni/shared/theme';
import { ShoppingCartIcon } from 'phosphor-react-native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useHousehold } from '@/core/household';
import {
  Button,
  confirm,
  EmptyState,
  ErrorState,
  Fab,
  FAB_SIZE,
  getErrorMessage,
  LoadingState,
  notifyError,
  notifySuccess,
  usePullToRefresh,
} from '@/shared/ui';

import { usePantryProducts } from '../hooks/usePantryProducts';
import { usePantrySummary } from '../hooks/usePantrySummary';
import { useSheetNotice } from '../hooks/useSheetNotice';
import { useShoppingList } from '../hooks/useShoppingList';
import { useShoppingListMutations } from '../hooks/useShoppingListMutations';
import { AddShoppingItemSheet } from './AddShoppingItemSheet';
import { CompletePurchaseSheet } from './CompletePurchaseSheet';
import { EditShoppingItemSheet } from './EditShoppingItemSheet';
import { GenerateBanner } from './GenerateBanner';
import { GenerateListSheet } from './GenerateListSheet';
import { ShoppingItemRow } from './ShoppingItemRow';

import type { PantryShoppingListItem } from '@omni/shared/pantry';
import type { ReactElement } from 'react';

type ShoppingListViewProps = {
  header: ReactElement;
};

/**
 * Pestaña de la lista de compras (`header`, el encabezado y las pestañas de la pantalla, va arriba para que se
 * mueva con la lista): banner de bajo stock, "Por comprar" y "Comprados". Marcar un ítem vinculado a un
 * producto lo compra al instante; uno libre pide cantidad y categoría en una hoja. El error de carga se muestra con
 * reintento, nunca como lista vacía.
 */
export function ShoppingListView({ header }: ShoppingListViewProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [completing, setCompleting] = useState<PantryShoppingListItem | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [editing, setEditing] = useState<PantryShoppingListItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);

  const { items, isLoading, error, mutate: retryList } = useShoppingList();
  const { summary, mutate: retrySummary } = usePantrySummary();
  const { products, mutate: retryProducts } = usePantryProducts();
  const { household } = useHousehold();
  const { generate, addItem, completeItem, updateItem, uncheckItem, removeItem, clearChecked } =
    useShoppingListMutations();
  const notice = useSheetNotice();
  const showAuthor = (household?.members.length ?? 0) > 1;
  const refreshControl = usePullToRefresh(() => Promise.all([retryList(), retrySummary(), retryProducts()]));

  const runItemAction = useCallback(
    async (id: string, action: () => Promise<unknown>, fallback: string, success?: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusyId(id);
      try {
        await action();
        if (success) notifySuccess(success);
      } catch (err) {
        notifyError(getErrorMessage(err, fallback));
      } finally {
        busyRef.current = false;
        setBusyId(null);
      }
    },
    []
  );

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
      setCompleteOpen(true);
    }
  };

  const handleRemove = async (item: PantryShoppingListItem) => {
    const confirmed = await confirm({
      title: `¿Quitar ${item.name}?`,
      description: 'Se saca de la lista de compras. No cambia tu alacena.',
      confirmLabel: 'Quitar',
      destructive: true,
    });
    if (confirmed) await runItemAction(item.id, () => removeItem(item.id), 'No se pudo quitar el ítem');
  };

  const handleClearChecked = () =>
    runItemAction('checked', clearChecked, 'No se pudieron limpiar los comprados', 'Comprados limpiados');

  const renderBody = () => {
    if (error && !items)
      return <ErrorState message="No se pudo cargar tu lista de compras" onRetry={() => void retryList()} />;
    if (isLoading || !items) return <LoadingState variant="skeleton" rows={4} />;

    const { pending, done } = splitShoppingList(items);

    return (
      <YStack gap={SPACING.md}>
        {summary && summary.lowStockCount > 0 ? (
          <GenerateBanner lowStockCount={summary.lowStockCount} onGenerate={() => setGenerateOpen(true)} />
        ) : null}

        <YStack gap={SPACING.sm}>
          <Paragraph fontWeight="700" accessibilityRole="header">
            Por comprar
          </Paragraph>
          {pending.length === 0 ? (
            <EmptyState
              icon={ShoppingCartIcon}
              title="Tu lista está vacía"
              action={
                <Button variant="light" alignSelf="center" onPress={() => setAddOpen(true)}>
                  Agregar a la lista
                </Button>
              }
            />
          ) : (
            pending.map(item => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                showAuthor={showAuthor}
                busy={busyId === item.id}
                onToggle={handleToggle}
                onEdit={entry => {
                  setEditing(entry);
                  setEditOpen(true);
                }}
                onRemove={entry => void handleRemove(entry)}
              />
            ))
          )}
        </YStack>

        <YStack gap={SPACING.sm}>
          <XStack alignItems="center" justifyContent="space-between">
            <Paragraph fontWeight="700" accessibilityRole="header">
              Comprados
            </Paragraph>
            {done.length > 0 ? (
              <Button variant="subtle" size="sm" onPress={() => void handleClearChecked()}>
                Limpiar comprados
              </Button>
            ) : null}
          </XStack>
          {done.length === 0 ? (
            <Paragraph color="$dimmed">Lo que tildes como comprado aparece acá y se suma a tu alacena.</Paragraph>
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
        </YStack>
      </YStack>
    );
  };

  return (
    <>
      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={{ gap: SPACING.md, paddingBottom: FAB_SIZE + SPACING.md * 2 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {header}
        {renderBody()}
      </ScrollView>
      <Fab onPress={() => setAddOpen(true)} accessibilityLabel="Agregar a la lista" />

      <AddShoppingItemSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={async payload => {
          await addItem(payload);
          notice.queue('Agregado a la lista');
        }}
        onClosed={notice.flush}
      />
      <GenerateListSheet
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        rows={buildGeneratePreview(products ?? [], items ?? [])}
        onConfirm={async () => {
          await generate();
          notice.queue('Lista generada');
        }}
        onClosed={notice.flush}
      />
      <CompletePurchaseSheet
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        item={completing}
        onConfirm={async (item, payload) => {
          await completeItem(item.id, payload);
          notice.queue('Marcado como comprado');
        }}
        onClosed={() => {
          notice.flush();
          setCompleting(null);
        }}
      />
      <EditShoppingItemSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        item={editing}
        onSave={async (item, quantityToBuy) => {
          await updateItem(item.id, quantityToBuy);
          notice.queue('Ítem actualizado');
        }}
        onClosed={() => {
          notice.flush();
          setEditing(null);
        }}
      />
    </>
  );
}
