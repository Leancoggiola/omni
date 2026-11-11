import { SERVER_WAKE_MESSAGE } from '@omni/shared/server-wake';
import { SPACING } from '@omni/shared/theme';
import { ClockIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { subscribeServerWake } from '@/shared/api';
import { Banner } from '@/shared/ui';

/** Debajo de los Sheets (zIndex 100 000) y a la par de la pila de notificaciones. */
const NOTICE_Z_INDEX = 99_999;

/** Banner persistente arriba de la pantalla mientras la API (Render free) despierta de un cold start. */
export function ServerWakeNotice() {
  const insets = useSafeAreaInsets();
  const [waking, setWaking] = useState(false);

  useEffect(() => subscribeServerWake(setWaking), []);

  if (!waking) return null;

  return (
    <YStack
      position="absolute"
      testID="server-wake-notice"
      top={insets.top + SPACING.sm}
      left={SPACING.md}
      right={SPACING.md}
      zIndex={NOTICE_Z_INDEX}
      pointerEvents="box-none"
    >
      <Banner floating color="info" icon={ClockIcon}>
        {SERVER_WAKE_MESSAGE}
      </Banner>
    </YStack>
  );
}
