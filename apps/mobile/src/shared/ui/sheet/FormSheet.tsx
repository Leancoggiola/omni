import { SPACING } from '@omni/shared/theme';
import { XIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { Sheet, XStack, YStack } from 'tamagui';

import { IconButton } from '../button/IconButton';
import { DisplayTitle } from '../DisplayTitle';

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
 * Con `busy` no se cierra ni por overlay, gesto, Atrás ni el botón de cerrar. `onClosed` llega una sola vez cuando el Modal
 * ya se ocultó (ahí un toast queda a la vista), aunque el padre lo pase nuevo en cada render; no llega si la hoja se
 * remonta antes ni si nunca se abrió.
 */
export function FormSheet({ open, onOpenChange, title, busy = false, onClosed, children }: FormSheetProps) {
  const [visible, setVisible] = useState(open);
  if (open && !visible) setVisible(true);

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
        dismissOnSnapToBottom={!busy}
        dismissOnOverlayPress={!busy}
        moveOnKeyboardChange
        zIndex={100_000}
        transition="medium"
      >
        <Sheet.Overlay transition="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <SheetFrame>
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
          <Sheet.ScrollView flex={1} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <YStack gap={SPACING.md}>{children}</YStack>
          </Sheet.ScrollView>
        </SheetFrame>
      </Sheet>
    </Modal>
  );
}
