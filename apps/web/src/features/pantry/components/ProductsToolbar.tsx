import { FC } from 'react';
import { Group, Paper, Select, TextInput } from '@mantine/core';

import type { PantryProductFilters } from '../types';
import type { PantryCategory } from '@omni/shared/pantry';

import { PANTRY_CATEGORIES, PANTRY_CATEGORY_LABELS } from '@omni/shared/pantry';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';

const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas las categorías' },
  ...PANTRY_CATEGORIES.map(value => ({ value, label: PANTRY_CATEGORY_LABELS[value] })),
];

interface ProductsToolbarProps {
  filters: PantryProductFilters;
  onChange: (filters: PantryProductFilters) => void;
}

/** Búsqueda por nombre y Select de categoría. */
export const ProductsToolbar: FC<ProductsToolbarProps> = ({ filters, onChange }) => (
  <Paper p="md">
    <Group gap="md" align="flex-end" wrap="wrap">
      <TextInput
        aria-label="Buscar en tu alacena"
        placeholder="Buscar..."
        value={filters.query}
        onChange={event => onChange({ ...filters, query: event.currentTarget.value })}
        leftSection={<MagnifyingGlassIcon size="1rem" />}
        flex={1}
        miw="12rem"
        size="md"
      />
      <Select
        aria-label="Categoría"
        data={CATEGORY_FILTER_OPTIONS}
        value={filters.category}
        onChange={value => onChange({ ...filters, category: (value as PantryCategory | 'all' | null) ?? 'all' })}
        allowDeselect={false}
        w={{ base: '100%', xs: '15rem' }}
        size="md"
      />
    </Group>
  </Paper>
);
