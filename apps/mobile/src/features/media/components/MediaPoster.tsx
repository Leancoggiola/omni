import { TMDB_POSTER_W185 } from '@omni/shared/media';
import { RADIUS } from '@omni/shared/theme';
import { Image } from 'expo-image';
import { FilmSlateIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

type MediaPosterProps = {
  posterPath: string | null;
  /** Ancho en dp; el alto sale de la proporción 2:3 del póster. */
  width: number;
};

/** Póster 2:3 de TMDB; sin imagen (o si falla la carga) muestra el ícono sobre la superficie atenuada. */
export function MediaPoster({ posterPath, width }: MediaPosterProps) {
  const colors = useSemanticColors();
  const [failed, setFailed] = useState(false);
  const height = Math.round((width * 3) / 2);

  if (!posterPath || failed) {
    return (
      <YStack
        width={width}
        height={height}
        borderRadius={RADIUS.sm}
        backgroundColor="$dimmedSurface"
        alignItems="center"
        justifyContent="center"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <FilmSlateIcon size={Math.round(width / 2.5)} color={colors.dimmed} />
      </YStack>
    );
  }

  return (
    <Image
      source={{ uri: `${TMDB_POSTER_W185}${posterPath}` }}
      style={{ width, height, borderRadius: RADIUS.sm, backgroundColor: colors.dimmedSurface }}
      contentFit="cover"
      transition={150}
      onError={() => setFailed(true)}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
