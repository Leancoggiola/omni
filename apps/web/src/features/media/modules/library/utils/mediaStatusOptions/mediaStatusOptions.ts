import { MEDIA_STATUS_LABELS, MEDIA_STATUSES } from '@omni/shared/media';

/** Opciones del `Select` de estado, compartidas por `MediaCard` y `MediaListItem`. */
export const MEDIA_STATUS_SELECT_DATA = MEDIA_STATUSES.map(value => ({
  value,
  label: MEDIA_STATUS_LABELS[value],
}));
