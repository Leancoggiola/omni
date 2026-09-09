import { lightbox } from '@mantine/lightbox';

import type { ImageLightboxOptions } from './types';

/** Opens the shared lightbox with a single image. */
export function openImageLightbox({ src, alt }: ImageLightboxOptions) {
  lightbox.open({ slides: [{ type: 'image', src, alt }] });
}
