import { FC } from 'react';
import { Select, SelectProps } from '@mantine/core';

import type { MediaStatus } from '../../types';

import styles from './MediaStatusSelect.module.scss';

import { MEDIA_STATUS_OPTIONS } from '@omni/shared/media';

interface MediaStatusSelectProps extends Omit<SelectProps, 'data' | 'value' | 'onChange' | 'mod' | 'classNames'> {
  status: MediaStatus;
  onStatusChange: (status: MediaStatus) => void;
}

/** Select del estado de un ítem de la lista: el color del input sigue al estado actual. */
export const MediaStatusSelect: FC<MediaStatusSelectProps> = ({ status, onStatusChange, ...props }) => (
  <Select
    {...props}
    data={MEDIA_STATUS_OPTIONS}
    value={status}
    onChange={value => value && onStatusChange(value as MediaStatus)}
    classNames={{ root: styles.root }}
    mod={status}
  />
);
