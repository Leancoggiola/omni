import { MEDIA_STATUS_LABELS, MEDIA_TYPE_LABELS, TMDB_POSTER_W185 } from '@omni/shared/media';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FilmSlateIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { EmptyState, ErrorState, LoadingState, SectionCard, StatusPill, Title } from '@/shared/ui';

import { useWatchingMedia, WATCHING_LIMIT } from '../hooks/useWatchingMedia';

import type { MediaItem } from '@omni/shared/media';

const POSTER = { width: 40, height: 60 } as const;

/** Póster 40 x 60 (2:3) con la miniatura w185; sin imagen (o si falla) muestra el ícono. Es decorativo. */
function WatchingPoster({ posterPath }: { posterPath: string | null }) {
  const colors = useSemanticColors();
  const [failed, setFailed] = useState(false);

  if (!posterPath || failed) {
    return (
      <YStack
        {...POSTER}
        borderRadius={RADIUS.sm}
        backgroundColor="$dimmedSurface"
        alignItems="center"
        justifyContent="center"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <FilmSlateIcon size={16} color={colors.dimmed} />
      </YStack>
    );
  }

  return (
    <Image
      source={{ uri: `${TMDB_POSTER_W185}${posterPath}` }}
      style={{ ...POSTER, borderRadius: RADIUS.sm, backgroundColor: colors.dimmedSurface }}
      contentFit="cover"
      onError={() => setFailed(true)}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}

/** Fila del widget: póster, título, tipo y pill "Viendo"; toda la fila lleva a Películas. */
function WatchingRow({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${MEDIA_TYPE_LABELS[item.mediaType]}, ${MEDIA_STATUS_LABELS[item.status]}. Ir a Películas`}
    >
      <XStack gap={SPACING.sm} alignItems="center">
        <WatchingPoster posterPath={item.posterPath} />
        <YStack flex={1} gap={SPACING['3xs']}>
          <Paragraph fontSize={FONT_SIZE.md} fontWeight="600" numberOfLines={1}>
            {item.title}
          </Paragraph>
          <Paragraph fontSize={FONT_SIZE.sm} color="$dimmed">
            {MEDIA_TYPE_LABELS[item.mediaType]}
          </Paragraph>
        </YStack>
        <StatusPill status={item.status} />
      </XStack>
    </Pressable>
  );
}

/**
 * Widget fijo "Seguís viendo" (= `WatchingCard` de web): hasta `WATCHING_LIMIT` ítems en estado "Viendo" y "Ver todo"
 * a Películas. Cargando es un skeleton, el error de SWR ofrece reintentar y nunca se muestra como vacío.
 */
export function WatchingCard() {
  const router = useRouter();
  const { items, isLoading, error, retry } = useWatchingMedia();
  const goToMedia = () => router.navigate('/media');

  return (
    <SectionCard>
      <XStack alignItems="center" justifyContent="space-between">
        <Title order={4} fontWeight="600">
          Seguís viendo
        </Title>
        <Pressable onPress={goToMedia} accessibilityRole="link" accessibilityLabel="Ver todo" hitSlop={8}>
          <Paragraph fontSize={FONT_SIZE.sm} fontWeight="600" color="$accent">
            Ver todo
          </Paragraph>
        </Pressable>
      </XStack>

      {error ? (
        <ErrorState message="No se pudo cargar tu lista" onRetry={retry} />
      ) : isLoading ? (
        <LoadingState variant="skeleton" rows={WATCHING_LIMIT} />
      ) : items.length === 0 ? (
        <EmptyState icon={FilmSlateIcon} title="No tenés nada en curso" />
      ) : (
        <YStack gap={SPACING.md}>
          {items.map(item => (
            <WatchingRow key={item.id} item={item} onPress={goToMedia} />
          ))}
        </YStack>
      )}
    </SectionCard>
  );
}
