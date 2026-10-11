import { MEDIA_STATUS_LABELS, MEDIA_STATUSES } from '@omni/shared/media';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { MagnifyingGlassIcon, XIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Paragraph, Sheet, XStack, YStack } from 'tamagui';

import {
  Banner,
  Button,
  ErrorState,
  getErrorMessage,
  IconButton,
  SegmentedControl,
  SHEET_EXIT_MS,
  Spinner,
  TextField,
  Title,
} from '@/shared/ui';

import { MIN_SEARCH_LENGTH, useMediaSearch } from '../hooks';
import { getTmdbResultKey, getTmdbResultTitle, resolveMediaType } from '../utils/tmdb';
import { TmdbResultRow } from './TmdbResultRow';

import type { MediaStatus, MediaType } from '@omni/shared/media';

const STATUS_OPTIONS = MEDIA_STATUSES.map(value => ({ value, label: MEDIA_STATUS_LABELS[value] }));

type Selection = { key: string; tmdbId: number; mediaType: MediaType };

type AddMediaSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `buildMediaTmdbKey` de los títulos que ya están en la lista (todos, no solo los filtrados). */
  existingTmdbIds: Set<string>;
  /** Tira si falla: el sheet muestra el error (Banner, como el Alert de web) y queda abierto. */
  onSubmit: (tmdbId: number, mediaType: MediaType, status: MediaStatus) => Promise<void>;
  /** El Modal ya se ocultó: recién ahí un toast queda a la vista. No llega si se remonta antes. */
  onClosed?: () => void;
};

/**
 * Agregar desde TMDB, el mismo flujo que `AddMediaModal` de web: buscar, tocar un resultado para
 * elegirlo, estado y "Agregar". El padre lo remonta con `key` en cada apertura, así arranca limpio.
 *
 * Va dentro de un `Modal` de RN y no con `<Sheet modal>`: el portal de Tamagui (fallback de Gorhom)
 * crashea en Fabric ("The specified child already has a parent"). El `Modal` es su propia ventana, así
 * que tapa las tabs; por eso el error se muestra adentro y no con un toast, que quedaría debajo. El
 * Modal se oculta `SHEET_EXIT_MS` después de cerrar (Tamagui no llama a `onAnimationComplete`): si no,
 * queda abierto y transparente encima de la app. El aviso de éxito lo da el padre en `onClosed`, que
 * sobrevive al remonte por `key`.
 */
export function AddMediaSheet({ open, onOpenChange, existingTmdbIds, onSubmit, onClosed }: AddMediaSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [status, setStatus] = useState<MediaStatus>('to_watch');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [visible, setVisible] = useState(open);
  if (open && !visible) setVisible(true);
  const submittingRef = useRef(false);
  const { results, error, isLoading, tooShort, retry } = useMediaSearch(query);

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onClosed?.();
    }, SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [open, onClosed]);

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
      onOpenChange(false);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo agregar'));
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
    if (error) return <ErrorState message="No se pudo buscar en TMDB" onRetry={retry} />;
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
    const rows = results.map(result => {
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
    return (
      <>
        {isLoading ? (
          <YStack paddingVertical={SPACING.xs} alignItems="center">
            <Spinner size="small" />
          </YStack>
        ) : null}
        {rows}
      </>
    );
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
          <XStack alignItems="center" justifyContent="space-between" gap={SPACING.sm}>
            <Title order={3} flexShrink={1}>
              Agregar película / serie
            </Title>
            <IconButton
              icon={XIcon}
              color="dimmed"
              accessibilityLabel="Cerrar"
              disabled={submitting}
              onPress={() => handleOpenChange(false)}
            />
          </XStack>
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
