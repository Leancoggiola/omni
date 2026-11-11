import { FC, useCallback, useState } from 'react';
import { Button, Stack } from '@mantine/core';

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

import { usePantryMutations } from '../hooks/usePantryMutations';
import { usePantryProducts } from '../hooks/usePantryProducts';
import { usePantrySummary } from '../hooks/usePantrySummary';
import { PantrySummaryCards } from './PantrySummaryCards';
import { ProductFormModal } from './ProductFormModal';
import { ProductsTable } from './ProductsTable';
import { ProductsToolbar } from './ProductsToolbar';

import type { CreatePantryProductPayload, PantryProduct, PantryProductFilters } from '@omni/shared/pantry';

import { DEFAULT_PANTRY_FILTERS, filterPantryProducts, hasActivePantryFilters } from '@omni/shared/pantry';
import { MagnifyingGlassIcon, PackageIcon, PlusIcon } from '@phosphor-icons/react';

interface InventoryViewProps {
  addOpened: boolean;
  onAddOpenedChange: (opened: boolean) => void;
  onOpenShoppingList: () => void;
}

/**
 * Pestaña de inventario: contadores, búsqueda y categoría, tabla y los modales de alta, detalle y baja. El error de
 * cualquiera de las dos cargas se muestra con reintento; nunca como alacena vacía.
 */
export const InventoryView: FC<InventoryViewProps> = ({ addOpened, onAddOpenedChange, onOpenShoppingList }) => {
  const [filters, setFilters] = useState<PantryProductFilters>(DEFAULT_PANTRY_FILTERS);
  const [editing, setEditing] = useState<PantryProduct | null>(null);
  const [editOpened, setEditOpened] = useState(false);

  const { products, isLoading, error, mutate: retryProducts } = usePantryProducts();
  const { summary, error: summaryError, mutate: retrySummary } = usePantrySummary();
  const { household } = useHousehold();
  const { createProduct, updateProduct, deleteProduct } = usePantryMutations();
  const showAuthor = (household?.members.length ?? 0) > 1;

  const handleCreate = useCallback(
    async (payload: CreatePantryProductPayload) => {
      await createProduct(payload);
      notifySuccess('Producto agregado');
    },
    [createProduct]
  );

  const handleUpdate = useCallback(
    async (payload: CreatePantryProductPayload) => {
      if (!editing) return;
      await updateProduct(editing.id, payload);
      notifySuccess('Producto actualizado');
    },
    [editing, updateProduct]
  );

  const handleDelete = useCallback(
    async (product: PantryProduct) => {
      const confirmed = await confirm({
        title: `¿Eliminar ${product.name}?`,
        description:
          'Se borra del inventario y también su ítem automático sin tildar de la lista. Esta acción no se puede deshacer.',
        confirmLabel: 'Eliminar',
      });
      if (!confirmed) return;

      try {
        await deleteProduct(product.id);
        setEditOpened(false);
        notifySuccess('Producto eliminado');
      } catch (err) {
        notifyError(getErrorMessage(err, 'No se pudo eliminar el producto'));
      }
    },
    [deleteProduct]
  );

  const openEdit = (product: PantryProduct) => {
    setEditing(product);
    setEditOpened(true);
  };

  const retry = () => Promise.all([retryProducts(), retrySummary()]);
  const filtered = products ? filterPantryProducts(products, filters) : [];
  const trimmedQuery = filters.query.trim();

  const renderContent = () => {
    if (error || summaryError) return <ErrorState message="No se pudo cargar tu alacena" onRetry={retry} />;
    if (isLoading || !products) return <LoadingState variant="skeleton" rows={5} />;

    if (products.length === 0) {
      return (
        <EmptyState
          icon={<PackageIcon />}
          title="Tu alacena está vacía"
          action={
            <Button variant="light" leftSection={<PlusIcon size="1rem" />} onClick={() => onAddOpenedChange(true)}>
              Agregar producto
            </Button>
          }
        />
      );
    }

    return (
      <>
        {summary && (
          <PantrySummaryCards
            summary={summary}
            alert={filters.alert}
            onAlertChange={alert => setFilters({ ...filters, alert })}
            onOpenShoppingList={onOpenShoppingList}
          />
        )}
        <ProductsToolbar filters={filters} onChange={setFilters} />
        {filtered.length === 0 ? (
          <EmptyState
            icon={<MagnifyingGlassIcon />}
            title={trimmedQuery ? `Sin resultados para «${trimmedQuery}»` : 'Sin resultados'}
            action={
              hasActivePantryFilters(filters) ? (
                <Button variant="outline" onClick={() => setFilters(DEFAULT_PANTRY_FILTERS)}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ProductsTable products={filtered} onEdit={openEdit} onDelete={handleDelete} />
        )}
      </>
    );
  };

  return (
    <Stack gap="lg">
      {renderContent()}

      <ProductFormModal opened={addOpened} onClose={() => onAddOpenedChange(false)} onSubmit={handleCreate} />
      {editing && (
        <ProductFormModal
          opened={editOpened}
          onClose={() => setEditOpened(false)}
          product={editing}
          showAuthor={showAuthor}
          onSubmit={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </Stack>
  );
};
