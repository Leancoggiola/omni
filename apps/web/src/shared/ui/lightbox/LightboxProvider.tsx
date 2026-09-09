import { FC } from 'react';
import { Lightbox } from '@mantine/lightbox';

const LABELS = {
  lightboxLabel: 'Visor de imagen',
  slidesLabel: 'Imagen',
  slideLabel: () => 'Imagen',
  previousSlideLabel: 'Anterior',
  nextSlideLabel: 'Siguiente',
  thumbnailLabel: () => 'Miniatura',
  enterFullscreenLabel: 'Pantalla completa',
  exitFullscreenLabel: 'Salir de pantalla completa',
  showThumbnailsLabel: 'Mostrar miniaturas',
  hideThumbnailsLabel: 'Ocultar miniaturas',
  downloadLabel: 'Descargar',
  closeLabel: 'Cerrar',
};

/** Single shared lightbox instance, opened imperatively via `openImageLightbox`. */
export const LightboxProvider: FC = () => (
  <Lightbox.Provider withNavigation={false} closeOnClickOutside labels={LABELS} />
);
