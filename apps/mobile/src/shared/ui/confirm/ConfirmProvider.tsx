import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Paragraph, Sheet, YStack } from 'tamagui';

import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';

import { Title } from '../Title';

import { registerConfirmHandler, type ConfirmRequest } from './confirm';

const CLOSE_FALLBACK_MS = 600;

/**
 * Confirmaciones en un bottom sheet. Botones apilados a lo ancho: confirmar arriba (filled) y
 * cancelar abajo (outlined), ver "Botones de acción" en `apps/mobile/CLAUDE.md`.
 */
export function ConfirmProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<ConfirmRequest[]>([]);
  const [current, setCurrent] = useState<ConfirmRequest | null>(null);
  // El Sheet de Tamagui solo se resincroniza con `open` cuando la prop cambia: si la siguiente
  // request entrara sin pasar por `open=false`, un cierre por overlay/gesto dejaría la cola trabada.
  // Por eso `current` vuelve a null entre requests y la siguiente entra al terminar el cierre.
  const [closing, setClosing] = useState(false);
  // Contenido de la última request: no vuelve a null al cerrar, así el sheet no se vacía durante la
  // animación de salida.
  const [shown, setShown] = useState<ConfirmRequest | null>(null);
  // Ref además del estado: el botón y el `onOpenChange(false)` del cierre pueden llegar en el mismo
  // tick, y la request tiene que resolverse una sola vez. Solo se escribe en efectos y handlers.
  const currentRef = useRef<ConfirmRequest | null>(null);

  useEffect(() => registerConfirmHandler(request => setPending(queue => [...queue, request])), []);

  useEffect(() => {
    if (current || closing || pending.length === 0) return;
    const [next] = pending;
    currentRef.current = next;
    setCurrent(next);
    setShown(next);
    setPending(queue => queue.slice(1));
  }, [current, closing, pending]);

  const close = useCallback((result: boolean) => {
    const request = currentRef.current;
    if (!request) return;
    currentRef.current = null;
    request.resolve(result);
    setCurrent(null);
    setClosing(true);
  }, []);

  // Respaldo por si `onAnimationComplete` no llega (p. ej. sin driver de animación): la cola no se traba.
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setClosing(false), CLOSE_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  // `@tamagui/sheet` no escucha el botón Atrás de Android: sin esto navegaría la pantalla de abajo.
  useEffect(() => {
    if (!current) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close(false);
      return true;
    });
    return () => sub.remove();
  }, [current, close]);

  const request = shown;

  return (
    <>
      {children}
      <Sheet
        open={current !== null}
        onOpenChange={(open: boolean) => {
          if (!open) close(false);
        }}
        onAnimationComplete={({ open }: { open: boolean }) => {
          if (!open) setClosing(false);
        }}
        snapPointsMode="fit"
        dismissOnSnapToBottom
        zIndex={100_000}
        transition="medium"
      >
        <Sheet.Overlay transition="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <Sheet.Handle />
        <Sheet.Frame
          backgroundColor="$backgroundStrong"
          borderTopLeftRadius={RADIUS.xl}
          borderTopRightRadius={RADIUS.xl}
          padding={SPACING.lg}
          paddingBottom={SPACING.lg + insets.bottom}
          gap={SPACING.lg}
        >
          <YStack gap={SPACING.xs}>
            <Title order={3}>{request?.title}</Title>
            <Paragraph fontSize={FONT_SIZE.lg} color="$dimmed">
              {request?.description}
            </Paragraph>
          </YStack>
          <YStack gap={SPACING.sm}>
            <Button size="$4" theme={request?.destructive ? 'red' : 'active'} onPress={() => close(true)}>
              {request?.confirmLabel}
            </Button>
            <Button size="$4" variant="outlined" onPress={() => close(false)}>
              {request?.cancelLabel}
            </Button>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
