import { MEDIA_STATUS_LABELS, MEDIA_STATUSES, MEDIA_TYPE_LABELS, MEDIA_TYPES } from '@omni/shared/media';
import { SPACING } from '@omni/shared/theme';
import { MagnifyingGlassIcon } from 'phosphor-react-native';
import { XStack, YStack } from 'tamagui';

import { SectionCard, SegmentedControl, Select, TextField } from '@/shared/ui';

import type { MediaListFilters } from '../utils/filterMedia';

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  ...MEDIA_TYPES.map(value => ({ value, label: MEDIA_TYPE_LABELS[value] })),
] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  ...MEDIA_STATUSES.map(value => ({ value, label: MEDIA_STATUS_LABELS[value] })),
] as const;

const TYPE_SELECT_WIDTH = 132;

type MediaToolbarProps = {
  filters: MediaListFilters;
  onChange: (filters: MediaListFilters) => void;
};

/** Filtros como `MediaListToolbar` de web: card con búsqueda y tipo, y debajo el estado. */
export function MediaToolbar({ filters, onChange }: MediaToolbarProps) {
  return (
    <YStack gap={SPACING.md}>
      <SectionCard>
        <XStack gap={SPACING.sm} alignItems="flex-start">
          <YStack flex={1}>
            <TextField
              placeholder="Buscar..."
              accessibilityLabel="Buscar en tu lista"
              leftSection={MagnifyingGlassIcon}
              value={filters.query}
              onChangeText={query => onChange({ ...filters, query })}
              returnKeyType="search"
              autoCorrect={false}
            />
          </YStack>
          <YStack width={TYPE_SELECT_WIDTH}>
            <Select
              data={TYPE_OPTIONS}
              value={filters.mediaType}
              onChange={mediaType => onChange({ ...filters, mediaType })}
              accessibilityLabel="Tipo"
            />
          </YStack>
        </XStack>
      </SectionCard>
      <SegmentedControl
        data={STATUS_OPTIONS}
        value={filters.status}
        onChange={status => onChange({ ...filters, status })}
        accessibilityLabel="Estado"
      />
    </YStack>
  );
}
