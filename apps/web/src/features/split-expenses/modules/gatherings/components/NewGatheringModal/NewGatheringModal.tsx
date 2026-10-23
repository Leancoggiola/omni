import { FC, useState } from 'react';
import { Modal } from '@mantine/core';

import { notifySuccess } from '@/shared/ui';

import { NewGatheringForm } from './NewGatheringForm';

import type { CreateGatheringPayload } from '@omni/shared/split-expenses';

interface NewGatheringModalProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (payload: CreateGatheringPayload) => Promise<void>;
}

export const NewGatheringModal: FC<NewGatheringModalProps> = ({ opened, onClose, onCreate }) => {
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleCreate = async (payload: CreateGatheringPayload) => {
    setLoading(true);
    try {
      await onCreate(payload);
      notifySuccess('Juntada creada');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Nueva juntada"
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <NewGatheringForm loading={loading} onCreate={handleCreate} onCancel={handleClose} />
    </Modal>
  );
};
