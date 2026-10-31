import { SPACING } from '@omni/shared/theme';
import { XIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { Sheet, XStack } from 'tamagui';

import { IconButton } from '../button/IconButton';
import { DisplayTitle } from '../DisplayTitle';

import { SheetFrame } from './SheetFrame';
import { SHEET_EXIT_MS } from './useSheetQueue';

import type { ReactNode } from 'react';

type FormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Con una operación en curso no se cierra ni por overlay, gesto, Atrás ni el botón de cerrar. */
  busy?: boolean;
  /** El Modal ya se ocultó: recién ahí un toast queda a la vista. No llega si se remonta antes. */
  onClosed?: () => void;
  children: ReactNode;
};

/**
 * Hoja inferior de formulario que tapa las tabs: `Modal` de RN con el `Sheet` sin `modal` y `SheetFrame` (el portal
 * de Tamagui crashea en Fabric, ver `AddMediaSheet`). El Modal se oculta `SHEET_EXIT_MS` después de cerrar, y como
 * mientras está visible tapa los toasts, el error va en un `Banner` adentro y el éxito se avisa desde `onClosed`.
 */
export function FormSheet({ open, onOpenChange, title, busy = false, onClosed, children }: FormSheetProps) {
  const [visible, setVisible] = useState(open);
  if (open && !visible) setVisible(true);

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onClosed?.();
    }, SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [open, onClosed]);

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
          <Sheet.ScrollView
            flex={1}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: SPACING.md }}
          >
            {children}
          </Sheet.ScrollView>
        </SheetFrame>
      </Sheet>
    </Modal>
  );
}
