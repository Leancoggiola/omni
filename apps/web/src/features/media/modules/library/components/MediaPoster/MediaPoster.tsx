import { useState } from 'react';
import { AspectRatio, Center, Image } from '@mantine/core';

import { TMDB_POSTER_W185 } from '@omni/shared/media';
import { FilmSlateIcon } from '@phosphor-icons/react';

const POSTER_RATIO = 2 / 3;

interface MediaPosterProps {
  posterPath: string | null;
}

/**
 * Póster 2:3 de TMDB (3,5 rem de ancho). Sin imagen, o si falla la carga, muestra el ícono sobre la superficie atenuada.
 * Remontar con `key` al cambiar `posterPath` reinicia el fallo. Es decorativo: el título va al lado, así que no tiene nombre accesible.
 */
export function MediaPoster({ posterPath }: MediaPosterProps) {
  const [failed, setFailed] = useState(false);

  return (
    <AspectRatio ratio={POSTER_RATIO} w="3.5rem" style={{ flexShrink: 0 }}>
      {posterPath && !failed ? (
        <Image src={`${TMDB_POSTER_W185}${posterPath}`} alt="" radius="sm" onError={() => setFailed(true)} />
      ) : (
        <Center bg="var(--mantine-color-default-hover)" c="dimmed" style={{ borderRadius: 'var(--mantine-radius-sm)' }}>
          <FilmSlateIcon size="1.5rem" aria-hidden />
        </Center>
      )}
    </AspectRatio>
  );
}
