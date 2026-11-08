// tamagui-ignore
import { SPACING } from '@omni/shared/theme';
import { useState } from 'react';
import { YStack } from 'tamagui';

import { NAV_ICONS } from '@/shared/navigation';
import { Screen, ScreenHeader, SegmentedControl } from '@/shared/ui';

import { InventoryView } from './components/InventoryView';
import { ShoppingListView } from './components/ShoppingListView';
import { usePantrySummary } from './hooks/usePantrySummary';

type PantryTab = 'inventory' | 'shopping';

/** Alacena: inventario y lista de compras del hogar, en dos pestañas (= `PantryPage` de web). */
export function PantryScreen() {
  const [tab, setTab] = useState<PantryTab>('inventory');
  const { summary } = usePantrySummary();
  const pending = summary?.shoppingListCount ?? 0;

  const header = (
    <YStack gap={SPACING.md}>
      <ScreenHeader
        icon={NAV_ICONS.pantry}
        title="Tu alacena"
        accent="alacena"
        subtitle="Tu inventario y la lista de compras"
      />
      <SegmentedControl
        data={[
          { value: 'inventory', label: 'Inventario' },
          { value: 'shopping', label: pending > 0 ? `Lista de compras (${pending})` : 'Lista de compras' },
        ]}
        value={tab}
        onChange={setTab}
        accessibilityLabel="Alacena"
      />
    </YStack>
  );

  return (
    <Screen>{tab === 'inventory' ? <InventoryView header={header} /> : <ShoppingListView header={header} />}</Screen>
  );
}
