import { FC } from 'react';
import { Badge, Button, Card, Group, Image, Menu, SimpleGrid, Stack, Text } from '@mantine/core';

import { EmptyState, LoadingState, openImageLightbox } from '@/shared/ui';

import { getTmdbResultKey, getTmdbResultTitle, resolveMediaType } from '../../../_shared/utils/tmdb';

import type { MediaStatus, MediaType, TmdbMediaResult } from '../../../_shared/types';

import { MEDIA_STATUS_LABELS, MEDIA_TYPE_LABELS, TMDB_POSTER_W500 } from '@omni/shared/media';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';

interface MediaSearchResultsProps {
  results: TmdbMediaResult[];
  isLoading: boolean;
  existingTmdbIds: Set<string>;
  onAdd: (tmdbId: number, mediaType: MediaType, status: MediaStatus) => void;
}

export const MediaSearchResults: FC<MediaSearchResultsProps> = ({ results, isLoading, existingTmdbIds, onAdd }) => {
  if (isLoading) {
    return <LoadingState />;
  }

  if (results.length === 0) {
    return <EmptyState icon={<MagnifyingGlassIcon />} title="No se encontraron resultados" />;
  }

  return (
    <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
      {results.map(item => {
        const mediaType = resolveMediaType(item);
        const title = getTmdbResultTitle(item);
        const key = getTmdbResultKey(item);
        const alreadyAdded = existingTmdbIds.has(key);
        const posterUrl = item.poster_path ? `${TMDB_POSTER_W500}${item.poster_path}` : undefined;

        return (
          <Card key={key} shadow="sm" padding="sm" radius="md" withBorder>
            <Card.Section>
              <Image
                src={posterUrl}
                h="13.75rem"
                alt={title}
                fallbackSrc="https://placehold.co/300x450?text=Sin+imagen"
                onClick={posterUrl ? () => openImageLightbox({ src: posterUrl, alt: title }) : undefined}
                style={posterUrl ? { cursor: 'zoom-in' } : undefined}
              />
            </Card.Section>

            <Stack gap="0.25rem" mt="xs">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Text fw={600} size="sm" lineClamp={2} style={{ flex: 1 }}>
                  {title}
                </Text>
                <Badge
                  size="xs"
                  variant="outline"
                  color={mediaType === 'movie' ? 'brand' : 'gray'}
                  style={{ flexShrink: 0 }}
                >
                  {MEDIA_TYPE_LABELS[mediaType]}
                </Badge>
              </Group>
            </Stack>

            {alreadyAdded ? (
              <Button fullWidth mt="sm" size="xs" variant="light" color="gray" disabled>
                Ya en tu lista
              </Button>
            ) : (
              <Menu shadow="md" width="11.25rem">
                <Menu.Target>
                  <Button fullWidth mt="sm" size="xs" variant="light">
                    Agregar a mi lista
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {(Object.entries(MEDIA_STATUS_LABELS) as [MediaStatus, string][]).map(([status, label]) => (
                    <Menu.Item key={status} onClick={() => onAdd(item.id, mediaType, status)}>
                      {label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            )}
          </Card>
        );
      })}
    </SimpleGrid>
  );
};
