import { useState } from 'react';
import { AspectRatio, Center, Image } from '@mantine/core';

import { openImageLightbox } from '@/shared/ui';

import type { KeyboardEvent } from 'react';

import { TMDB_POSTER_W185, TMDB_POSTER_W500 } from '@omni/shared/media';
import { FilmSlateIcon } from '@phosphor-icons/react';

const POSTER_RATIO = 2 / 3;

interface MediaPosterProps {
  posterPath: string | null;
  variant?: 'thumb' | 'cover';
  title?: string;
  zoomable?: boolean;
}

/**
 * Póster 2:3 de TMDB. `thumb` (por defecto) mide 3,5 rem con la miniatura w185 y es decorativo: el título va al lado,
 * así que no tiene nombre accesible. `cover` ocupa todo el ancho con la w500, usa `title` como `alt` y, con
 * `zoomable`, abre el póster en el lightbox con clic, Enter o Espacio. Sin imagen, o si falla la carga, muestra el ícono sobre la superficie atenuada.
 * Remontar con `key` al cambiar `posterPath` reinicia el fallo.
 */
export function MediaPoster({ posterPath, variant = 'thumb', title = '', zoomable = false }: MediaPosterProps) {
  const [failed, setFailed] = useState(false);
  const isCover = variant === 'cover';
  const src = `${isCover ? TMDB_POSTER_W500 : TMDB_POSTER_W185}${posterPath}`;
  const openLightbox = () => openImageLightbox({ src, alt: title });

  return (
    <AspectRatio ratio={POSTER_RATIO} w={isCover ? '100%' : '3.5rem'} style={{ flexShrink: 0 }}>
      {posterPath && !failed ? (
        <Image
          src={src}
          alt={isCover ? title : ''}
          radius={isCover ? undefined : 'sm'}
          onError={() => setFailed(true)}
          {...(zoomable && {
            role: 'button',
            tabIndex: 0,
            onClick: openLightbox,
            onKeyDown: (event: KeyboardEvent<HTMLImageElement>) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              openLightbox();
            },
            style: { cursor: 'zoom-in' },
          })}
        />
      ) : isCover ? (
        <Center h="100%" bg="terracotta.5" c="dimmed">
          <FilmSlateIcon size="6rem" color="white" aria-hidden />
        </Center>
      ) : (
        <Center bg="var(--mantine-color-default-hover)" c="dimmed" style={{ borderRadius: 'var(--mantine-radius-sm)' }}>
          <FilmSlateIcon size="1.5rem" aria-hidden />
        </Center>
      )}
    </AspectRatio>
  );
}
