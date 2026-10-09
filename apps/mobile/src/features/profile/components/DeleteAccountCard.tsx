import { useRef, useState } from 'react';

import { Button, confirm, getErrorMessage, notifyError, SectionCard } from '@/shared/ui';

type DeleteAccountCardProps = {
  /** Borra la cuenta y cierra la sesión: al resolver, la pantalla se desmonta. */
  onDelete: () => Promise<void>;
};

/** Zona de peligro (= `DeleteAccountButton` de web): advertencia + botón destructivo + `confirm()`. */
export function DeleteAccountCard({ onDelete }: DeleteAccountCardProps) {
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  const handlePress = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const confirmed = await confirm({
        title: 'Eliminar cuenta',
        description:
          '¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer. Se borrarán todos tus datos de forma permanente.',
        confirmLabel: 'Sí, eliminar mi cuenta',
      });
      if (!confirmed) return;

      setLoading(true);
      try {
        await onDelete();
      } catch (err) {
        notifyError(getErrorMessage(err, 'No se pudo eliminar la cuenta'));
        setLoading(false);
      }
    } finally {
      busy.current = false;
    }
  };

  return (
    <SectionCard
      title="¿Eliminar tu cuenta?"
      subtitle="Se borran todos tus datos de forma permanente. Esta acción no se puede deshacer."
    >
      <Button fullWidth color="destructive" loading={loading} onPress={() => void handlePress()}>
        Eliminar cuenta
      </Button>
    </SectionCard>
  );
}
