import { FC, useState } from 'react';
import { Modal } from '@mantine/core';

import { notifySuccess } from '@/shared/ui';

import { JoinCodeStep } from './JoinCodeStep';
import { JoinPreviewStep } from './JoinPreviewStep';

import type { HouseholdInvitePreview } from '@omni/shared/household';

import { getInviteErrorMessage } from '@omni/shared/household';

interface JoinHouseholdModalProps {
  opened: boolean;
  onClose: () => void;
  onPreview: (code: string) => Promise<HouseholdInvitePreview>;
  onAccept: (code: string) => Promise<void>;
}

interface Reviewed {
  code: string;
  preview: HouseholdInvitePreview;
}

/**
 * "Tengo un código": primero se revisa (`preview`, sin cambiar nada) y recién después se acepta. El estado vive en
 * el modal para que se reinicie al cerrar (Mantine desmonta el contenido).
 */
export const JoinHouseholdModal: FC<JoinHouseholdModalProps> = ({ opened, onClose, onPreview, onAccept }) => (
  <Modal opened={opened} onClose={onClose} title="Ingresar código" centered>
    <JoinFlow onClose={onClose} onPreview={onPreview} onAccept={onAccept} />
  </Modal>
);

const JoinFlow: FC<Omit<JoinHouseholdModalProps, 'opened'>> = ({ onClose, onPreview, onAccept }) => {
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      setReviewed({ code, preview: await onPreview(code) });
    } catch (err) {
      setError(getInviteErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!reviewed || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onAccept(reviewed.code);
      notifySuccess(`Ya compartís tu hogar con ${reviewed.preview.inviter.name}`);
      onClose();
    } catch (err) {
      setError(getInviteErrorMessage(err));
      setLoading(false);
    }
  };

  if (reviewed) {
    return (
      <JoinPreviewStep
        preview={reviewed.preview}
        loading={loading}
        error={error}
        onAccept={() => void handleAccept()}
        onCancel={onClose}
      />
    );
  }

  return (
    <JoinCodeStep loading={loading} error={error} onSubmit={code => void handlePreview(code)} onCancel={onClose} />
  );
};
