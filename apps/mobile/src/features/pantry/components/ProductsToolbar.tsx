import { PANTRY_CATEGORIES, PANTRY_CATEGORY_LABELS } from '@omni/shared/pantry';
import { SPACING } from '@omni/shared/theme';
import { MagnifyingGlassIcon } from 'phosphor-react-native';
import { XStack, YStack } from 'tamagui';

import { SectionCard, Select, TextField } from '@/shared/ui';

import type { PantryCategory, PantryProductFilters } from '@omni/shared/pantry';

const CATEGORY_SELECT_WIDTH = 132;

const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  ...PANTRY_CATEGORIES.map(value => ({ value, label: PANTRY_CATEGORY_LABELS[value] })),
] as const;

type ProductsToolbarProps = {
  filters: PantryProductFilters;
  onChange: (filters: PantryProductFilters) => void;
};

/** Búsqueda por nombre y Select de categoría, en una card como `ProductsToolbar` de web. */
export function ProductsToolbar({ filters, onChange }: ProductsToolbarProps) {
  return (
    <SectionCard>
      <XStack gap={SPACING.sm} alignItems="flex-start">
        <YStack flex={1}>
          <TextField
            placeholder="Buscar..."
            accessibilityLabel="Buscar en tu alacena"
            leftSection={MagnifyingGlassIcon}
            value={filters.query}
            onChangeText={query => onChange({ ...filters, query })}
            returnKeyType="search"
            autoCorrect={false}
          />
        </YStack>
        <YStack width={CATEGORY_SELECT_WIDTH}>
          <Select<PantryCategory | 'all'>
            data={CATEGORY_FILTER_OPTIONS}
            value={filters.category}
            onChange={category => onChange({ ...filters, category })}
            accessibilityLabel="Categoría"
          />
        </YStack>
      </XStack>
    </SectionCard>
  );
}
