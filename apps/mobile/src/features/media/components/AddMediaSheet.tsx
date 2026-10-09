import { MEDIA_STATUS_LABELS, MEDIA_STATUSES } from '@omni/shared/media';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { MagnifyingGlassIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Paragraph, Sheet, YStack } from 'tamagui';

import {
  Banner,
  Button,
  ErrorState,
  getErrorMessage,
  notifySuccess,
  SegmentedControl,
  Spinner,
  TextField,
  Title,
} from '@/shared/ui';

import { MIN_SEARCH_LENGTH, useMediaSearch } from '../hooks';
import { getTmdbResultKey, getTmdbResultTitle, resolveMediaType } from '../utils/tmdb';
import { TmdbResultRow } from './TmdbResultRow';

import type { MediaStatus, MediaType } from '@omni/shared/media';

const STATUS_OPTIONS = MEDIA_STATUSES.map(value => ({ value, label: MEDIA_STATUS_LABELS[value] }));

/**
 * Duración de la salida del Sheet: recién ahí se oculta el Modal. Tamagui no llama a
 * `onAnimationComplete` al cerrar (por eso `useSheetQueue` también usa un tiempo fijo); sin esto el
 * Modal queda abierto y transparente encima de la app, tapando los toasts.
 */
const CLOSE_ANIMATION_MS = 400;

type Selection = { key: string; tmdbId: number; mediaType: MediaType };

type AddMediaSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `buildMediaTmdbKey` de los títulos que ya están en la lista (todos, no solo los filtrados). */
  existingTmdbIds: Set<string>;
  /** Tira si falla: el sheet muestra el error (Banner, como el Alert de web) y queda abierto. */
  onSubmit: (tmdbId: number, mediaType: MediaType, status: MediaStatus) => Promise<void>;
};

/**
 * Agregar desde TMDB, el mismo flujo que `AddMediaModal` de web: buscar, tocar un resultado para
 * elegirlo, estado y "Agregar". El padre lo remonta con `key` en cada apertura, así arranca limpio.
 *
 * Va dentro de un `Modal` de RN y no con `<Sheet modal>`: el portal de Tamagui (fallback de Gorhom)
 * crashea en Fabric ("The specified child already has a parent"). El `Modal` es su propia ventana, así
 * que tapa las tabs; por eso el error se muestra adentro y no con un toast, que quedaría debajo.
 */
export function AddMediaSheet({ open, onOpenChange, existingTmdbIds, onSubmit }: AddMediaSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [status, setStatus] = useState<MediaStatus>('to_watch');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // El Modal sigue visible hasta que termina la animación de cierre del Sheet.
  const [visible, setVisible] = useState(open);
  if (open && !visible) setVisible(true);
  // El estado de React llega tarde para cortar un doble toque en "Agregar".
  const submittingRef = useRef(false);
  // El toast vive en la ventana de la app: con el Modal todavía visible quedaría tapado.
  const added = useRef(false);
  const { results, error, isLoading, tooShort } = useMediaSearch(query);

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setVisible(false);
      if (added.current) {
        added.current = false;
        notifySuccess('Agregado a tu lista');
      }
    }, CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next && submittingRef.current) return;
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!selection || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(selection.tmdbId, selection.mediaType, status);
      added.current = true;
      submittingRef.current = false;
      onOpenChange(false);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo agregar'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const renderResults = () => {
    if (tooShort) {
      return (
        <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm} textAlign="center" paddingVertical={SPACING.md}>
          Escribí al menos {MIN_SEARCH_LENGTH} caracteres
        </Paragraph>
      );
    }
    if (error) return <ErrorState message="No se pudo buscar en TMDB" />;
    if (results.length === 0) {
      return isLoading ? (
        <YStack paddingVertical={SPACING.md} alignItems="center">
          <Spinner />
        </YStack>
      ) : (
        <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm} textAlign="center" paddingVertical={SPACING.md}>
          No se encontraron resultados
        </Paragraph>
      );
    }
    return results.map(result => {
      const key = getTmdbResultKey(result);
      const mediaType = resolveMediaType(result);
      return (
        <TmdbResultRow
          key={key}
          title={getTmdbResultTitle(result)}
          mediaType={mediaType}
          posterPath={result.poster_path}
          selected={selection?.key === key}
          alreadyAdded={existingTmdbIds.has(key)}
          onPress={() => {
            setSelection({ key, tmdbId: result.id, mediaType });
            Keyboard.dismiss();
          }}
        />
      );
    });
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
        dismissOnSnapToBottom={!submitting}
        dismissOnOverlayPress={!submitting}
        moveOnKeyboardChange
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
          gap={SPACING.md}
        >
          <Title order={3}>Agregar película / serie</Title>
          {submitError ? <Banner color="destructive">{submitError}</Banner> : null}
          <TextField
            label="Título"
            required
            placeholder="Buscar en TMDB..."
            leftSection={MagnifyingGlassIcon}
            value={query}
            onChangeText={text => {
              setQuery(text);
              setSelection(null);
            }}
            autoCorrect={false}
            returnKeyType="search"
          />
          <Sheet.ScrollView
            flex={1}
            keyboardShouldPersistTaps="handled"
            accessibilityRole="radiogroup"
            accessibilityLabel="Resultados de TMDB"
            contentContainerStyle={{ gap: SPACING['2xs'] }}
          >
            {renderResults()}
          </Sheet.ScrollView>
          <YStack gap={SPACING['2xs']}>
            <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
              Estado
            </Paragraph>
            <SegmentedControl data={STATUS_OPTIONS} value={status} onChange={setStatus} accessibilityLabel="Estado" />
          </YStack>
          <Button fullWidth disabled={!selection} loading={submitting} onPress={() => void handleSubmit()}>
            Agregar
          </Button>
        </Sheet.Frame>
      </Sheet>
    </Modal>
  );
}
