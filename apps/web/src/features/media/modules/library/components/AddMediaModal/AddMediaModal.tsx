import { FC, useState } from 'react';
import { Modal } from '@mantine/core';

import { notifySuccess } from '@/shared/ui';

import { AddMediaForm } from './AddMediaForm';

import type { MediaStatus, MediaType } from '../../../_shared/types';

interface AddMediaModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (tmdbId: number, mediaType: MediaType, status: MediaStatus) => Promise<void>;
  existingTmdbIds: Set<string>;
}

export const AddMediaModal: FC<AddMediaModalProps> = ({ opened, onClose, onSubmit, existingTmdbIds }) => {
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleSubmit = async (tmdbId: number, mediaType: MediaType, status: MediaStatus) => {
    setLoading(true);
    try {
      await onSubmit(tmdbId, mediaType, status);
      notifySuccess('Agregado a tu lista');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Agregar película / serie"
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <AddMediaForm
        loading={loading}
        existingTmdbIds={existingTmdbIds}
        onSubmit={handleSubmit}
        onCancel={handleClose}
      />
    </Modal>
  );
};
