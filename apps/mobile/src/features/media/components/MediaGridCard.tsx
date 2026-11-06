import { MEDIA_STATUS_LABELS, MEDIA_TYPE_LABELS } from '@omni/shared/media';
import { FONT_SIZE, LINE_HEIGHT, RADIUS, SPACING } from '@omni/shared/theme';
import { TrashIcon } from 'phosphor-react-native';
import { memo, useState } from 'react';
import { Paragraph, YStack } from 'tamagui';

import { useItemAuthor } from '@/core/household';
import { useColorSchemeControl } from '@/core/theme';
import { AuthorTag, Badge, IconButton, StatusPill } from '@/shared/ui';
import { glassElevation } from '@/theme/elevation';

import { MediaPoster } from './MediaPoster';

import type { MediaItem } from '@omni/shared/media';
import type { LayoutChangeEvent } from 'react-native';

const CARD_PADDING = SPACING.xs;
const OVERLAY_OFFSET = SPACING.xs;

type MediaGridCardProps = {
  item: MediaItem;
  onStatusPress: (item: MediaItem) => void;
  onDeletePress: (item: MediaItem) => void;
};

/**
 * Tarjeta de la grilla (= `MediaCard` de web) en una card glass: póster 2:3 al ancho de la tarjeta con el badge de
 * tipo y el tacho (sobre un círculo sólido, para que se lea sobre pósters oscuros) encima, título en 2 líneas, autor si el ítem es compartido y pill de estado tocable. El ancho del
 * póster sale de medir la tarjeta (la grilla es de dos columnas, cada celda al 50% con medio gap de padding, así la
 * última tarjeta de una cantidad impar no se estira) y el alto lo da `MediaPoster`.
 */
export const MediaGridCard = memo(function MediaGridCard({ item, onStatusPress, onDeletePress }: MediaGridCardProps) {
  const { colorScheme } = useColorSchemeControl();
  const author = useItemAuthor(item.createdById);
  const [posterWidth, setPosterWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const width = Math.floor(event.nativeEvent.layout.width - CARD_PADDING * 2 - 2);
    if (width > 0 && width !== posterWidth) setPosterWidth(width);
  };

  return (
    <YStack width="50%" paddingHorizontal={SPACING.sm / 2}>
      <YStack
        flex={1}
        backgroundColor="$surfaceGlass"
        borderWidth={1}
        borderColor="$glassBorder"
        borderRadius={RADIUS.xl}
        padding={CARD_PADDING}
        gap={SPACING.xs}
        onLayout={onLayout}
        {...glassElevation('card', colorScheme)}
      >
        <YStack>
          {posterWidth > 0 ? <MediaPoster posterPath={item.posterPath} width={posterWidth} /> : null}
          <YStack position="absolute" top={OVERLAY_OFFSET} left={OVERLAY_OFFSET}>
            <Badge color="accent" variant="filled">
              {MEDIA_TYPE_LABELS[item.mediaType]}
            </Badge>
          </YStack>
          <YStack
            position="absolute"
            top={OVERLAY_OFFSET}
            right={OVERLAY_OFFSET}
            borderRadius={RADIUS.full}
            backgroundColor="$background"
          >
            <IconButton
              icon={TrashIcon}
              variant="glass"
              color="destructive"
              size="sm"
              accessibilityLabel={`Eliminar ${item.title}`}
              onPress={() => onDeletePress(item)}
            />
          </YStack>
        </YStack>
        <YStack flex={1} gap={SPACING.xs} justifyContent="space-between" paddingHorizontal={SPACING['2xs']}>
          <YStack gap={SPACING.xs}>
            <Paragraph fontSize={FONT_SIZE.md} lineHeight={LINE_HEIGHT.lg} fontWeight="600" numberOfLines={2}>
              {item.title}
            </Paragraph>
            {author ? <AuthorTag author={author} /> : null}
          </YStack>
          <StatusPill
            status={item.status}
            onPress={() => onStatusPress(item)}
            accessibilityLabel={`Estado de ${item.title}: ${MEDIA_STATUS_LABELS[item.status]}. Cambiar estado`}
          />
        </YStack>
      </YStack>
    </YStack>
  );
});
