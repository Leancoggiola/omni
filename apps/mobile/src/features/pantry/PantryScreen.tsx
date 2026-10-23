import { NAV_REGISTRY } from '@omni/shared/navigation';
import { ClockCountdownIcon } from 'phosphor-react-native';

import { NAV_ICONS } from '@/shared/navigation';
import { EmptyState, Screen, ScreenHeader } from '@/shared/ui';

/** Tab reservada para la alacena: la pantalla llega con #48. */
export function PantryScreen() {
  return (
    <Screen>
      <ScreenHeader
        icon={NAV_ICONS.pantry}
        title={NAV_REGISTRY.pantry.label}
        subtitle="Tu inventario y la lista de compras"
      />
      <EmptyState icon={ClockCountdownIcon} title="Próximamente" />
    </Screen>
  );
}
