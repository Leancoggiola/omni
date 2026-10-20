import { FC } from 'react';
import { Select, SelectProps } from '@mantine/core';

import { MEDIA_STATUS_SELECT_DATA } from '../../utils/mediaStatusOptions';

import type { MediaStatus } from '../../../_shared/types';

import styles from './MediaStatusSelect.module.scss';

interface MediaStatusSelectProps extends Omit<SelectProps, 'data' | 'value' | 'onChange' | 'mod'> {
  status: MediaStatus;
  onStatusChange: (status: MediaStatus) => void;
}

/** Select del estado de un ítem de la lista: el color del input sigue al estado actual. */
export const MediaStatusSelect: FC<MediaStatusSelectProps> = ({ status, onStatusChange, ...props }) => (
  <Select
    {...props}
    data={MEDIA_STATUS_SELECT_DATA}
    value={status}
    onChange={value => value && onStatusChange(value as MediaStatus)}
    classNames={{ root: styles.root }}
    mod={status}
  />
);
