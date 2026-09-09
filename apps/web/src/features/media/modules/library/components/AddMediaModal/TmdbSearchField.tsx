import { FC, useCallback, useMemo } from 'react';
import { Combobox, TextInput, useCombobox } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';

import { getTmdbResultKey, getTmdbResultTitle, resolveMediaType } from '../../../_shared/utils/tmdb';
import { useMediaSearch } from '../../../search/hooks/useMediaSearch';
import { TmdbSearchOption } from './TmdbSearchOption';

import type { MediaType } from '../../../_shared/types';

const MIN_QUERY_LENGTH = 2;

interface TmdbSearchFieldProps {
  value: string;
  error?: string;
  existingTmdbIds: Set<string>;
  onQueryChange: (value: string) => void;
  onSelect: (tmdbId: number, mediaType: MediaType, title: string, posterPath: string | null) => void;
}

export const TmdbSearchField: FC<TmdbSearchFieldProps> = ({
  value,
  error,
  existingTmdbIds,
  onQueryChange,
  onSelect,
}) => {
  const [debouncedQuery] = useDebouncedValue(value, 400);
  const trimmedQuery = debouncedQuery.trim();
  const { data, isLoading } = useMediaSearch(trimmedQuery.length >= MIN_QUERY_LENGTH ? debouncedQuery : '', 1, 'multi');

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.selectFirstOption(),
  });

  const searchResults = useMemo(() => data?.results ?? [], [data]);

  const handleOptionSubmit = useCallback(
    (optionValue: string) => {
      const item = searchResults.find(result => getTmdbResultKey(result) === optionValue);
      if (!item) return;

      onSelect(item.id, resolveMediaType(item), getTmdbResultTitle(item), item.poster_path);
      combobox.closeDropdown();
    },
    [searchResults, onSelect, combobox]
  );

  return (
    <Combobox store={combobox} onOptionSubmit={handleOptionSubmit}>
      <Combobox.Target>
        <TextInput
          label="Título"
          placeholder="Buscar en TMDB..."
          required
          value={value}
          error={error}
          onChange={event => {
            onQueryChange(event.currentTarget.value);
            combobox.openDropdown();
          }}
          onFocus={() => combobox.openDropdown()}
          rightSection={<Combobox.Chevron />}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {trimmedQuery.length < MIN_QUERY_LENGTH ? (
            <Combobox.Empty>Escribí al menos 2 caracteres</Combobox.Empty>
          ) : searchResults.length > 0 ? (
            searchResults.map(item => (
              <TmdbSearchOption
                key={getTmdbResultKey(item)}
                item={item}
                alreadyAdded={existingTmdbIds.has(getTmdbResultKey(item))}
              />
            ))
          ) : isLoading ? (
            <Combobox.Empty>Buscando...</Combobox.Empty>
          ) : (
            <Combobox.Empty>No se encontraron resultados</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};
