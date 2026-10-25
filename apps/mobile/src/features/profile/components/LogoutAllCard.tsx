import { useRef, useState } from 'react';

import { Button, confirm, getErrorMessage, notifyError, SectionCard } from '@/shared/ui';

type LogoutAllCardProps = {
  onLogoutAll: () => Promise<void>;
};

/**
 * Cierra la sesión en todos los dispositivos, este incluido, con `confirm()` antes: los demás dejan de poder refrescar
 * y piden login en cuanto vence su access token. `onLogoutAll` revoca las sesiones en la API y cierra la local (al
 * resolver, la pantalla se desmonta); si falla, avisa y la sesión queda abierta.
 */
export function LogoutAllCard({ onLogoutAll }: LogoutAllCardProps) {
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  const handlePress = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const confirmed = await confirm({
        title: 'Cerrar sesión en todos los dispositivos',
        description:
          'Se cerrará tu sesión en este celular, en la web y en cualquier otro dispositivo. Vas a tener que volver a ingresar en cada uno.',
        confirmLabel: 'Sí, cerrar todas',
      });
      if (!confirmed) return;

      setLoading(true);
      try {
        await onLogoutAll();
      } catch (err) {
        notifyError(getErrorMessage(err, 'No se pudieron cerrar las sesiones'));
      } finally {
        setLoading(false);
      }
    } finally {
      busy.current = false;
    }
  };

  return (
    <SectionCard title="Sesiones" subtitle="Si perdiste un dispositivo o usaste uno ajeno, cerrá la sesión en todos.">
      <Button fullWidth variant="outline" color="destructive" loading={loading} onPress={() => void handlePress()}>
        Cerrar sesión en todos los dispositivos
      </Button>
    </SectionCard>
  );
}
