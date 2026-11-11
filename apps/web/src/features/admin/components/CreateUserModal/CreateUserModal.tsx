import { FC, useState } from 'react';
import { Modal } from '@mantine/core';

import { notifySuccess } from '@/shared/ui';

import { CreateUserForm } from './CreateUserForm';

import type { CreateUserPayload } from '@omni/shared/auth';

interface CreateUserModalProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (payload: CreateUserPayload) => Promise<unknown>;
}

export const CreateUserModal: FC<CreateUserModalProps> = ({ opened, onClose, onCreate }) => {
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleCreate = async (payload: CreateUserPayload) => {
    setLoading(true);
    try {
      await onCreate(payload);
      notifySuccess('Usuario creado');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Crear usuario"
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <CreateUserForm loading={loading} onCreate={handleCreate} onCancel={handleClose} />
    </Modal>
  );
};
