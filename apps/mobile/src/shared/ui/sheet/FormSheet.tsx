import { SPACING } from '@omni/shared/theme';
import { XIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { Sheet, XStack, YStack } from 'tamagui';

import { IconButton } from '../button/IconButton';
import { DisplayTitle } from '../DisplayTitle';
import { FormFields, FormScrollProvider } from '../form/FormContext';
import { useKeyboardInset } from '../form/useKeyboardInset';
import { useScrollFocusedInputIntoView } from '../form/useScrollFocusedInputIntoView';

import { SheetFrame } from './SheetFrame';
import { SHEET_EXIT_MS } from './useSheetQueue';

import type { ReactNode } from 'react';

type FormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  busy?: boolean;
  onClosed?: () => void;
  children: ReactNode;
};

/**
 * Hoja inferior de formulario que tapa las tabs: `Modal` de RN con el `Sheet` sin `modal` y `SheetFrame` (el portal
 * de Tamagui crashea en Fabric, ver `AddMediaSheet`). El Modal se oculta `SHEET_EXIT_MS` después de cerrar, y como
 * mientras está visible tapa los toasts, el error va en un `Banner` adentro y el éxito se avisa desde `onClosed`.
 * La hoja no se arrastra (`disableDrag`): un toque con el dedo apenas movido sobre el formulario la desplazaba hacia
 * abajo y, al soltar con el scroll interno trabado, Tamagui no la devolvía a su lugar, así que cada toque la achicaba
 * un poco más. Se cierra por overlay, Atrás o el botón de cerrar; con `busy` no se cierra por ninguno. `onClosed` llega una sola vez cuando el Modal
 * ya se ocultó (ahí un toast queda a la vista), aunque el padre lo pase nuevo en cada render; no llega si la hoja se
 * remonta antes ni si nunca se abrió. El teclado no mueve la hoja (moverla cancelaba toques como el ojo de la
 * contraseña): el frame se achica arriba del teclado, el campo enfocado scrollea a la vista y "Siguiente" salta al
 * próximo campo (`FormFields`).
 */
export function FormSheet({ open, onOpenChange, title, busy = false, onClosed, children }: FormSheetProps) {
  const [visible, setVisible] = useState(open);
  if (open && !visible) setVisible(true);

  const keyboardInset = useKeyboardInset();
  const { scrollRef, onScroll, scrollIntoView } = useScrollFocusedInputIntoView();

  useEffect(() => {
    if (keyboardInset > 0) scrollIntoView();
  }, [keyboardInset, scrollIntoView]);

  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  });

  useEffect(() => {
    if (open || !visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onClosedRef.current?.();
    }, SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [open, visible]);

  const handleOpenChange = (next: boolean) => {
    if (!next && busy) return;
    onOpenChange(next);
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={() => handleOpenChange(false)}
    >
      <Sheet
        open={open}
        onOpenChange={handleOpenChange}
        snapPoints={[90]}
        snapPointsMode="percent"
        disableDrag
        dismissOnSnapToBottom={!busy}
        dismissOnOverlayPress={!busy}
        zIndex={100_000}
        transition="medium"
      >
        <Sheet.Overlay transition="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <SheetFrame keyboardInset={keyboardInset}>
          <XStack alignItems="center" justifyContent="space-between" gap={SPACING.sm}>
            <DisplayTitle size="md" flexShrink={1}>
              {title}
            </DisplayTitle>
            <IconButton
              icon={XIcon}
              variant="light"
              accessibilityLabel="Cerrar"
              disabled={busy}
              onPress={() => handleOpenChange(false)}
            />
          </XStack>
          <Sheet.ScrollView
            ref={scrollRef}
            flex={1}
            onScroll={onScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <FormScrollProvider scrollIntoView={scrollIntoView}>
              <FormFields>
                <YStack gap={SPACING.md}>{children}</YStack>
              </FormFields>
            </FormScrollProvider>
          </Sheet.ScrollView>
        </SheetFrame>
      </Sheet>
    </Modal>
  );
}
