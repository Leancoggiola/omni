// tamagui-ignore
import { DEFAULT_PANTRY_FILTERS, filterPantryProducts, hasActivePantryFilters } from '@omni/shared/pantry';
import { SPACING } from '@omni/shared/theme';
import { MagnifyingGlassIcon, PackageIcon, PlusIcon } from 'phosphor-react-native';
import { useCallback, useRef, useState } from 'react';
import { FlatList, type ListRenderItem } from 'react-native';
import { YStack } from 'tamagui';

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

import { usePantryMutations } from '../hooks/usePantryMutations';
import { usePantryProducts } from '../hooks/usePantryProducts';
import { usePantrySummary } from '../hooks/usePantrySummary';
import { useSheetNotice } from '../hooks/useSheetNotice';
import { PantrySummaryCards } from './PantrySummaryCards';
import { ProductFormSheet } from './ProductFormSheet';
import { ProductRow } from './ProductRow';
import { ProductsToolbar } from './ProductsToolbar';

import type { CreatePantryProductPayload, PantryProduct, PantryProductFilters } from '@omni/shared/pantry';
import type { ReactElement } from 'react';

type InventoryViewProps = {
  /** Encabezado y pestañas de la pantalla: van arriba de la lista para que se muevan con ella. */
  header: ReactElement;
};

function Separator() {
  return <YStack height={SPACING.sm} />;
}

/**
 * Pestaña de inventario: contadores, búsqueda y categoría, lista de productos y las hojas de alta, detalle y baja. El
 * error de cualquiera de las dos cargas se muestra con reintento; nunca como alacena vacía.
 */
export function InventoryView({ header }: InventoryViewProps) {
  const [filters, setFilters] = useState<PantryProductFilters>(DEFAULT_PANTRY_FILTERS);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<PantryProduct | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const pendingDelete = useRef<PantryProduct | null>(null);

  const { products, isLoading, error, mutate: retryProducts } = usePantryProducts();
  const { summary, error: summaryError, mutate: retrySummary } = usePantrySummary();
  const { household } = useHousehold();
  const { createProduct, updateProduct, deleteProduct } = usePantryMutations();
  const notice = useSheetNotice();
  const showAuthor = (household?.members.length ?? 0) > 1;
  const retry = useCallback(() => Promise.all([retryProducts(), retrySummary()]), [retryProducts, retrySummary]);
  const refreshControl = usePullToRefresh(retry);

  const handleCreate = useCallback(
    async (payload: CreatePantryProductPayload) => {
      await createProduct(payload);
      notice.queue('Producto agregado');
    },
    [createProduct, notice]
  );

  const handleUpdate = useCallback(
    async (payload: CreatePantryProductPayload) => {
      if (!editing) return;
      await updateProduct(editing.id, payload);
      notice.queue('Producto actualizado');
    },
    [editing, updateProduct, notice]
  );

  const runDelete = useCallback(
    async (product: PantryProduct) => {
      const confirmed = await confirm({
        title: `¿Eliminar ${product.name}?`,
        description:
          'Se borra del inventario y también su ítem automático sin tildar de la lista. Esta acción no se puede deshacer.',
        confirmLabel: 'Eliminar',
        destructive: true,
      });
      if (!confirmed) return;
      try {
        await deleteProduct(product.id);
        notifySuccess('Producto eliminado');
      } catch (err) {
        notifyError(getErrorMessage(err, 'No se pudo eliminar el producto'));
      }
    },
    [deleteProduct]
  );

  const handleDeleteRequest = useCallback((product: PantryProduct) => {
    pendingDelete.current = product;
    setEditOpen(false);
  }, []);

  const handleEditClosed = useCallback(() => {
    notice.flush();
    setEditing(null);
    const product = pendingDelete.current;
    pendingDelete.current = null;
    if (product) void runDelete(product);
  }, [notice, runDelete]);

  const openEdit = useCallback((product: PantryProduct) => {
    setEditing(product);
    setEditOpen(true);
  }, []);

  const renderItem = useCallback<ListRenderItem<PantryProduct>>(
    ({ item }) => <ProductRow product={item} onPress={openEdit} />,
    [openEdit]
  );

  const failed = Boolean(error || summaryError);
  const filtered = products ? filterPantryProducts(products, filters) : [];
  const trimmedQuery = filters.query.trim();

  const renderEmpty = () => {
    if (failed) return <ErrorState message="No se pudo cargar tu alacena" onRetry={() => void retry()} />;
    if (isLoading || !products) return <LoadingState variant="skeleton" rows={5} />;
    if (products.length === 0) {
      return (
        <EmptyState
          icon={PackageIcon}
          title="Tu alacena está vacía"
          action={
            <Button variant="light" leftSection={PlusIcon} alignSelf="center" onPress={() => setAddOpen(true)}>
              Agregar producto
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={MagnifyingGlassIcon}
        title={trimmedQuery ? `Sin resultados para «${trimmedQuery}»` : 'Sin resultados'}
        action={
          hasActivePantryFilters(filters) ? (
            <Button variant="outline" alignSelf="center" onPress={() => setFilters(DEFAULT_PANTRY_FILTERS)}>
              Limpiar filtros
            </Button>
          ) : undefined
        }
      />
    );
  };

  const showControls = !failed && Boolean(products) && (products?.length ?? 0) > 0;

  return (
    <>
      <FlatList
        data={failed ? [] : filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <YStack gap={SPACING.md} paddingBottom={SPACING.md}>
            {header}
            {showControls && summary ? (
              <PantrySummaryCards
                summary={summary}
                alert={filters.alert}
                onAlertChange={alert => setFilters({ ...filters, alert })}
              />
            ) : null}
            {showControls ? <ProductsToolbar filters={filters} onChange={setFilters} /> : null}
          </YStack>
        }
        ListEmptyComponent={renderEmpty()}
        ItemSeparatorComponent={Separator}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: FAB_SIZE + SPACING.md * 2 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />
      <Fab onPress={() => setAddOpen(true)} accessibilityLabel="Agregar producto" />

      <ProductFormSheet open={addOpen} onOpenChange={setAddOpen} onSubmit={handleCreate} onClosed={notice.flush} />
      {editing ? (
        <ProductFormSheet
          key={editing.id}
          open={editOpen}
          onOpenChange={setEditOpen}
          product={editing}
          showAuthor={showAuthor}
          onSubmit={handleUpdate}
          onDelete={handleDeleteRequest}
          onClosed={handleEditClosed}
        />
      ) : null}
    </>
  );
}
