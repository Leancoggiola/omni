import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { SPACING } from '@omni/shared/theme';

import { NotificationCard } from './NotificationCard';
import { registerNotificationHandler, type NotificationRequest } from './notify';

/** Mismo `autoClose` que el default de Mantine en web. */
const AUTO_CLOSE_MS = 4000;
const MAX_VISIBLE = 3;

function AnimatedNotification({ request, onClose }: { request: NotificationRequest; onClose: (id: number) => void }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => onClose(request.id), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [progress, onClose, request.id]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
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
 * Pila de notificaciones arriba de la pantalla. Montar una vez en `app/_layout.tsx`; las features
 * llaman a `notifySuccess` / `notifyError` / … de `@/shared/ui`, nunca a `Alert.alert`.
 */
export function NotificationsProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<NotificationRequest[]>([]);

  const close = useCallback((id: number) => {
    setItems(current => current.filter(item => item.id !== id));
  }, []);

  useEffect(
    () =>
      registerNotificationHandler(request => {
        setItems(current => [...current, request].slice(-MAX_VISIBLE));
      }),
    []
  );

  return (
    <>
      {children}
      <YStack
        position="absolute"
        top={insets.top + SPACING.xs}
        left={SPACING.md}
        right={SPACING.md}
        gap={SPACING.xs}
        zIndex={100_000}
        pointerEvents="box-none"
      >
        {items.map(item => (
          <AnimatedNotification key={item.id} request={item} onClose={close} />
        ))}
      </YStack>
    </>
  );
}
