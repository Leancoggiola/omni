import { useRef, useState } from 'react';

import { useBiometrics } from '@/core/biometrics';
import { getErrorMessage, notifyError, SectionCard, Switch } from '@/shared/ui';

/**
 * Seguridad: toggle de la biometría de este dispositivo (#173). No se muestra nada si el teléfono no tiene biometría
 * enrolada. Guarda al instante como las demás preferencias, con la diferencia de que activarla pide antes una
 * verificación biométrica: si se cancela, el switch vuelve a apagado sin avisar; si falla, vuelve con un
 * `notifyError`. Los textos se adaptan al tipo (huella / rostro). Desactivarla no pide verificación.
 */
export function SecurityCard() {
  const { available, enabled, noun, enable, disable } = useBiometrics();
  const [pending, setPending] = useState<boolean | null>(null);
  const inFlight = useRef(false);

  if (!available) return null;

  const change = async (next: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(next);
    try {
      if (next) {
        const result = await enable();
        if (result === 'failed') notifyError(`No se pudo verificar tu ${noun}. No se activó el ingreso.`);
      } else {
        await disable();
      }
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo guardar la preferencia'));
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  return (
    <SectionCard title="Seguridad" subtitle="Protegé el acceso desde este celular">
      <Switch
        label={`Ingresar con ${noun}`}
        description={`Pedir tu ${noun} al abrir Omni y en los módulos con información sensible. Se guarda solo en este dispositivo.`}
        checked={pending ?? enabled}
        onCheckedChange={checked => void change(checked)}
      />
    </SectionCard>
  );
}
