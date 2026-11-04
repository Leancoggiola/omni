import { Link } from 'react-router-dom';
import {
  Anchor,
  AspectRatio,
  Badge,
  Center,
  Group,
  Image,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';

import { EmptyState, ErrorState } from '@/shared/ui';

import { useWatchingMedia, WATCHING_LIMIT } from '../hooks/useWatchingMedia';

import type { MediaItem } from '@omni/shared/media';
import type { FC } from 'react';

import { MEDIA_STATUS_LABELS, MEDIA_TYPE_LABELS, TMDB_POSTER_W185 } from '@omni/shared/media';
import { NAV_REGISTRY } from '@omni/shared/navigation';
import { FilmSlateIcon } from '@phosphor-icons/react';

const MEDIA_PATH = NAV_REGISTRY.media.path;

/** Póster 40 x 60 (2:3) con la miniatura w185; sin imagen muestra el ícono. Es decorativo: el título va al lado. */
const WatchingPoster: FC<{ posterPath: string | null }> = ({ posterPath }) => (
  <AspectRatio ratio={2 / 3} w="2.5rem" style={{ flexShrink: 0 }}>
    {posterPath ? (
      <Image src={`${TMDB_POSTER_W185}${posterPath}`} alt="" radius="sm" />
    ) : (
      <Center bg="var(--mantine-color-default-hover)" c="dimmed" style={{ borderRadius: 'var(--mantine-radius-sm)' }}>
        <FilmSlateIcon size="1.25rem" aria-hidden />
      </Center>
    )}
  </AspectRatio>
);

const WatchingRow: FC<{ item: MediaItem }> = ({ item }) => (
  <UnstyledButton
    component={Link}
    to={MEDIA_PATH}
    aria-label={`${item.title}, ${MEDIA_TYPE_LABELS[item.mediaType]}, ${MEDIA_STATUS_LABELS[item.status]}. Ir a Películas`}
  >
    <Group wrap="nowrap" gap="sm">
      <WatchingPoster posterPath={item.posterPath} />
      <Stack gap="3xs" flex={1} miw={0}>
        <Text fw={600} size="sm" lineClamp={1}>
          {item.title}
        </Text>
        <Text size="xs" c="dimmed">
          {MEDIA_TYPE_LABELS[item.mediaType]}
        </Text>
      </Stack>
      <Badge size="sm" variant="light" color="terracotta" style={{ flexShrink: 0 }}>
        {MEDIA_STATUS_LABELS[item.status]}
      </Badge>
    </Group>
  </UnstyledButton>
);

/**
 * Widget fijo "Seguís viendo" de Inicio: hasta `WATCHING_LIMIT` ítems en estado "Viendo" con enlace "Ver todo" a
 * Películas. Cargando es un skeleton, el error de SWR ofrece reintentar y nunca se muestra como vacío.
 */
export const WatchingCard: FC = () => {
  const { items, isLoading, error, mutate } = useWatchingMedia();

  return (
    <Paper
      component="section"
      withBorder
      bg="var(--mantine-color-surfaces-primary-light)"
      radius="lg"
      shadow="none"
      p="md"
      aria-labelledby="watching-card-title"
    >
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Title id="watching-card-title" order={5} fz="md" lh="1.5rem" fw={700}>
            Seguís viendo
          </Title>
          <Anchor component={Link} to={MEDIA_PATH} size="sm" fw={600}>
            Ver todo
          </Anchor>
        </Group>

        {error ? (
          <ErrorState message="No se pudo cargar tu lista" onRetry={() => mutate()} />
        ) : isLoading ? (
          <Stack gap="sm" role="status" aria-busy="true" aria-label="Cargando tu lista">
            {Array.from({ length: WATCHING_LIMIT }, (_, index) => (
              <Skeleton key={index} h="3.75rem" />
            ))}
          </Stack>
        ) : items.length === 0 ? (
          <EmptyState icon={<FilmSlateIcon size="1.5rem" />} title="No tenés nada en curso" />
        ) : (
          <Stack gap="sm">
            {items.map(item => (
              <WatchingRow key={item.id} item={item} />
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};
