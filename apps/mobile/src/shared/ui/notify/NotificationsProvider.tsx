import { SPACING } from '@omni/shared/theme';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { NotificationCard } from './NotificationCard';
import { autoCloseMs, enqueueNotification, registerNotificationHandler, type NotificationRequest } from './notify';

/** Por encima del Sheet de `confirm()` (`zIndex` 100 000): un error de la acción confirmada se tiene que ver. */
const STACK_Z_INDEX = 100_001;

/**
 * Alto de lo que ocupa el borde inferior (la tab bar, con su inset). La pila se apoya encima; sin tab
 * bar (login, Perfil) queda sobre el inset del sistema.
 */
const BottomOffsetContext = createContext<(height: number) => void>(() => undefined);

/** Para la tab bar: informa su alto (incluye el inset inferior) y lo libera al desmontarse. */
export function useNotificationsBottomOffset() {
  return useContext(BottomOffsetContext);
}

function AnimatedNotification({ request, onClose }: { request: NotificationRequest; onClose: (id: number) => void }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => onClose(request.id), autoCloseMs(request.variant));
    return () => clearTimeout(timer);
  }, [progress, onClose, request.id, request.variant]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      <NotificationCard
        variant={request.variant}
        title={request.title}
        message={request.message}
        onClose={() => onClose(request.id)}
      />
    </Animated.View>
  );
}

/**
 * Pila de notificaciones abajo de la pantalla, como en web (la más nueva, abajo). Montar una vez en
 * `app/_layout.tsx`; las features llaman a `notifySuccess` / `notifyError` / … de `@/shared/ui`, nunca
 * a `Alert.alert`.
 */
export function NotificationsProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<NotificationRequest[]>([]);
  const [bottomOffset, setBottomOffset] = useState(0);

  const close = useCallback((id: number) => {
    setItems(current => current.filter(item => item.id !== id));
  }, []);

  useEffect(
    () =>
      registerNotificationHandler(request => {
        setItems(current => enqueueNotification(current, request));
      }),
    []
  );

  return (
    <BottomOffsetContext.Provider value={setBottomOffset}>
      {children}
      <YStack
        position="absolute"
        bottom={Math.max(bottomOffset, insets.bottom) + SPACING.sm}
        left={SPACING.md}
        right={SPACING.md}
        gap={SPACING.xs}
        zIndex={STACK_Z_INDEX}
        pointerEvents="box-none"
      >
        {items.map(item => (
          <AnimatedNotification key={item.id} request={item} onClose={close} />
        ))}
      </YStack>
    </BottomOffsetContext.Provider>
  );
}
