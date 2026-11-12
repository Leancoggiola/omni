// tamagui-ignore
import { NAV_REGISTRY, type NavKey } from '@omni/shared/navigation';
import { SPACING } from '@omni/shared/theme';
import { LockKeyIcon } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { Paragraph, YStack } from 'tamagui';

import { Button, EmptyState, notifyError, Screen, ScreenHeader } from '@/shared/ui';

import { biometricIcon } from './biometricIcon';
import { isSensitiveModule } from './biometrics';
import { useBiometrics } from './BiometricsContext';

type SensitiveGateProps = {
  module: NavKey;
  onBack?: () => void;
  children: ReactNode;
};

/**
 * Envuelve la pantalla de un módulo sensible (`SENSITIVE_MODULES`, hoy Gastos) y pide biometría al entrar si no hubo un
 * desbloqueo en los últimos `SENSITIVE_UNLOCK_TTL_MS` o si la app pasó por background desde el último. Mientras está
 * bloqueado no se monta nada de `children`, así que no se piden ni se muestran sus datos. Si la persona no activó la
 * biometría (o el teléfono no tiene), el módulo no es sensible o ya hay un desbloqueo vigente, renderiza `children` sin
 * más. Cancelar no avisa nada y queda el botón para reintentar; una falla avisa con `notifyError`. Como alternativa
 * a la biometría el sistema ofrece el PIN o patrón del teléfono. La vigencia se evalúa al entrar y al volver de
 * background: una pantalla que ya está abierta no se cierra sola a los 5 minutos.
 *
 * `module` es el módulo que protege (solo pide biometría si está en `SENSITIVE_MODULES`). `onBack` marca una ruta de
 * stack: suma el botón de volver del header a la pantalla bloqueada y el inset inferior de las rutas sin tab bar.
 */
export function SensitiveGate({ module, onBack, children }: SensitiveGateProps) {
  const { enabled, kind, noun, isSensitiveUnlocked, authenticateSensitive, sensitiveEpoch } = useBiometrics();
  const [unlockedEpoch, setUnlockedEpoch] = useState<number | null>(() =>
    isSensitiveUnlocked() ? sensitiveEpoch : null
  );
  const [busy, setBusy] = useState(false);

  if (!enabled || !isSensitiveModule(module) || unlockedEpoch === sensitiveEpoch) return <>{children}</>;

  const unlock = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await authenticateSensitive();
      if (result === 'success') setUnlockedEpoch(sensitiveEpoch);
      else if (result === 'failed') notifyError(`No se pudo verificar tu ${noun}. Probá de nuevo.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen insetBottom={onBack !== undefined}>
      <ScreenHeader title={NAV_REGISTRY[module].label} onBack={onBack} backLabel="Volver" />
      <EmptyState
        icon={LockKeyIcon}
        title="Módulo protegido"
        action={
          <YStack alignSelf="stretch" gap={SPACING.md}>
            <Paragraph color="$dimmed" textAlign="center">
              {`Verificá tu ${noun} para ver esta información.`}
            </Paragraph>
            <Button fullWidth size="lg" leftSection={biometricIcon(kind)} loading={busy} onPress={() => void unlock()}>
              {`Desbloquear con ${noun}`}
            </Button>
          </YStack>
        }
      />
    </Screen>
  );
}
