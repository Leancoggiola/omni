import { SPACING } from '@omni/shared/theme';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, Dimensions, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { NotificationCard } from './NotificationCard';
import { autoCloseMs, enqueueNotification, registerNotificationHandler, type NotificationRequest } from './notify';

/**
 * Debajo de los Sheets (`confirm()`, `actionSheet()`: `zIndex` 100 000). Abajo comparten franja con
 * sus botones, y un toast encima los taparía (y absorbería el toque). El error de una acción
 * confirmada llega cuando el sheet ya está cerrando, así que se ve igual.
 */
const STACK_Z_INDEX = 99_999;

/**
 * Alto de lo que ocupa el borde inferior (la tab bar, con su inset). La pila se apoya encima; sin tab
 * bar a la vista (login, Perfil) queda sobre el inset del sistema.
 */
const BottomOffsetContext = createContext<(height: number) => void>(() => undefined);

/** Setter para `MeasuredTabBar`: informa su alto (incluye el inset inferior), 0 al ocultarse. */
export function useSetNotificationsBottomOffset() {
  return useContext(BottomOffsetContext);
}

/**
 * Cuánto tapa el teclado de la ventana. Con edge-to-edge la ventana puede no achicarse: se mide
 * contra su alto, así sirve tanto si se achica (da 0) como si no.
 */
function useKeyboardOverlap() {
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event =>
      setOverlap(Math.max(0, Dimensions.get('window').height - event.endCoordinates.screenY))
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setOverlap(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return overlap;
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
  const keyboardOverlap = useKeyboardOverlap();

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
        testID="notifications-stack"
        bottom={Math.max(bottomOffset, insets.bottom, keyboardOverlap) + SPACING.sm}
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
