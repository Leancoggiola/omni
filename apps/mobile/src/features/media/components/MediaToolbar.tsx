import { MEDIA_STATUS_FILTER_OPTIONS, MEDIA_TYPE_FILTER_OPTIONS } from '@omni/shared/media';
import { SPACING } from '@omni/shared/theme';
import { MagnifyingGlassIcon } from 'phosphor-react-native';
import { XStack, YStack } from 'tamagui';

import { SectionCard, SegmentedControl, Select, TextField } from '@/shared/ui';

import type { MediaListFilters } from '@omni/shared/media';

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
              data={MEDIA_TYPE_FILTER_OPTIONS}
              value={filters.mediaType}
              onChange={mediaType => onChange({ ...filters, mediaType })}
              accessibilityLabel="Tipo"
            />
          </YStack>
        </XStack>
      </SectionCard>
      <SegmentedControl
        data={MEDIA_STATUS_FILTER_OPTIONS}
        value={filters.status}
        onChange={status => onChange({ ...filters, status })}
        accessibilityLabel="Estado"
      />
    </YStack>
  );
}
