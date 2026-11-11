import { FC, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Stack } from '@mantine/core';

import { useHousehold } from '@/core/household';

import { InventoryView } from './components/InventoryView';
import { PantryHeader } from './components/PantryHeader';
import { ShoppingListView } from './components/ShoppingListView';
import { usePantrySummary } from './hooks/usePantrySummary';

import type { PantryTab } from './types';

/** Alacena: inventario y lista de compras del hogar; la pestaña activa vive en `?tab=` para poder enlazarla. */
export const PantryPage: FC = () => {
  const [params, setParams] = useSearchParams();
  const [addOpened, setAddOpened] = useState(false);
  const { summary } = usePantrySummary();
  const { household } = useHousehold();
  const tab: PantryTab = params.get('tab') === 'shopping' ? 'shopping' : 'inventory';

  const handleTabChange = (next: PantryTab) => {
    setParams(next === 'shopping' ? { tab: 'shopping' } : {}, { replace: true });
  };

  return (
    <Stack gap="lg">
      <PantryHeader
        tab={tab}
        onTabChange={handleTabChange}
        pendingCount={summary?.shoppingListCount}
        linked={(household?.members.length ?? 0) > 1}
        onAddProduct={() => setAddOpened(true)}
      />
      {tab === 'inventory' ? (
        <InventoryView
          addOpened={addOpened}
          onAddOpenedChange={setAddOpened}
          onOpenShoppingList={() => handleTabChange('shopping')}
        />
      ) : (
        <ShoppingListView />
      )}
    </Stack>
  );
};
