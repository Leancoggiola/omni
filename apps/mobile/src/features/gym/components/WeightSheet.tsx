import { GYM_WEEKDAY_LABELS } from '@omni/shared/gym';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { ArchiveIcon, MinusIcon, PlusIcon, XIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { Sheet, XStack, YStack } from 'tamagui';

import {
  Banner,
  Button,
  DisplayTitle,
  IconButton,
  LoadingState,
  Paragraph,
  SHEET_EXIT_MS,
  SheetFrame,
  SheetOverlay,
  TextField,
} from '@/shared/ui';

import { useGymSheetSubmit } from '../hooks/useGymSheetSubmit';
import { useGymWeightHistory } from '../hooks/useGymWeightHistory';
import {
  formatHistoryDate,
  formatSetsReps,
  formatSetsRepsShort,
  formatWeight,
  formatWeightKg,
} from '../utils/gymFormat';
import { schemeChangeNotes } from '../utils/historyNotes';
import { stepWeight, WEIGHT_STEP_KG } from '../utils/weightStep';
import { parseWeightInput, weightInputError, weightInputText } from '../utils/weightInput';
import { ExerciseTile } from './ExerciseTile';
import { GymErrorBanner } from './GymErrorBanner';
import { SectionLabel } from './SectionLabel';

import type { GymSubmitResult } from '../utils/gymSubmit';
import type { GymExercise, GymWeekday, GymWeightEntry } from '@omni/shared/gym';

const SNAP_POINT = 80;

type WeightSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: GymExercise;
  weekday: GymWeekday;
  readOnly: boolean;
  onSave: (weightKg: number) => Promise<GymSubmitResult>;
  onClear: () => Promise<GymSubmitResult>;
  onClosed?: () => void;
};

type HistoryRowProps = { entry: GymWeightEntry; note?: string; last: boolean };

function HistoryRow({ entry, note, last }: HistoryRowProps) {
  const weight = formatWeightKg(entry.weightKg);
  const effort = formatSetsRepsShort(entry.sets, entry.reps);
  const date = formatHistoryDate(entry.recordedAt);

  return (
    <YStack
      gap={SPACING['3xs']}
      paddingVertical={SPACING.sm}
      borderBottomWidth={last ? 0 : 1}
      borderColor="hairline"
      accessible
      accessibilityLabel={`${weight}, ${effort}, ${date}${note ? `. ${note}` : ''}`}
    >
      <XStack alignItems="center" gap={SPACING.md}>
        <Paragraph width={88} fontSize={FONT_SIZE.lg} fontWeight="700">
          {weight}
        </Paragraph>
        <Paragraph flex={1} fontSize={FONT_SIZE.lg} color="dimmed" numberOfLines={1}>
          {effort}
        </Paragraph>
        <Paragraph fontSize={FONT_SIZE.sm} color="dimmed">
          {date}
        </Paragraph>
      </XStack>
      {note ? (
        <Paragraph fontSize={FONT_SIZE.sm} color="dimmed">
          {note}
        </Paragraph>
      ) : null}
    </YStack>
  );
}

type StepperProps = {
  text: string;
  previous: number | null;
  error: string | null;
  onChangeText: (text: string) => void;
};

function WeightStepper({ text, previous, error, onChangeText }: StepperProps) {
  const next = parseWeightInput(text);
  const numeric = next ?? 0;
  const invalid = next === null && text.trim() !== '';
  const caption =
    previous === null
      ? 'kg · todavía sin peso'
      : next === previous
        ? 'kg · peso actual'
        : `kg · antes ${formatWeightKg(previous)}`;

  return (
    <YStack gap={SPACING.xs}>
      <XStack
        alignItems="center"
        justifyContent="space-between"
        padding={SPACING.sm}
        borderRadius={RADIUS.lg}
        backgroundColor="track"
        accessibilityLabel="Peso en kilos"
      >
        <IconButton
          icon={MinusIcon}
          variant="filled"
          size="lg"
          accessibilityLabel={`Restar ${formatWeight(WEIGHT_STEP_KG)} kg`}
          disabled={invalid || numeric <= 0}
          onPress={() => onChangeText(weightInputText(stepWeight(numeric, -WEIGHT_STEP_KG)))}
        />
        <YStack alignItems="center" flex={1} paddingHorizontal={SPACING.sm}>
          <TextField
            accessibilityLabel="Peso en kg"
            placeholder="—"
            keyboardType="decimal-pad"
            textAlign="center"
            value={text}
            onChangeText={onChangeText}
            error={error ?? undefined}
          />
          <Paragraph color="dimmed" fontSize={FONT_SIZE.md}>
            {caption}
          </Paragraph>
        </YStack>
        <IconButton
          icon={PlusIcon}
          variant="filled"
          size="lg"
          accessibilityLabel={`Sumar ${formatWeight(WEIGHT_STEP_KG)} kg`}
          disabled={invalid}
          onPress={() => onChangeText(weightInputText(stepWeight(numeric, WEIGHT_STEP_KG)))}
        />
      </XStack>
    </YStack>
  );
}

type HistoryProps = { history: ReturnType<typeof useGymWeightHistory>; readOnly: boolean };

function WeightHistory({ history, readOnly }: HistoryProps) {
  const notes = schemeChangeNotes(history.entries);

  if (history.error && history.entries.length === 0) {
    return (
      <YStack gap={SPACING.xs} paddingVertical={SPACING.sm}>
        <Paragraph color="dimmed" fontSize={FONT_SIZE.md}>
          No se pudo cargar el historial.
        </Paragraph>
        <Button variant="outline" color="destructive" onPress={() => void history.mutate()}>
          Reintentar
        </Button>
      </YStack>
    );
  }
  if (history.isLoading) return <LoadingState size="small" />;
  if (history.entries.length === 0) {
    return (
      <Paragraph color="dimmed" fontSize={FONT_SIZE.md} paddingVertical={SPACING.sm}>
        {readOnly
          ? 'Todavía no hay registros.'
          : 'Todavía no hay registros. Cuando guardes el primer peso va a aparecer acá.'}
      </Paragraph>
    );
  }
  return (
    <>
      {history.error ? (
        <YStack gap={SPACING.xs} paddingVertical={SPACING.sm}>
          <Paragraph color="dimmed" fontSize={FONT_SIZE.md}>
            No se pudieron cargar más registros.
          </Paragraph>
          <Button variant="outline" color="destructive" onPress={() => void history.mutate()}>
            Reintentar
          </Button>
        </YStack>
      ) : null}
      {history.entries.map((entry, index) => (
        <HistoryRow
          key={entry.id}
          entry={entry}
          note={notes.get(entry.id)}
          last={index === history.entries.length - 1 && !history.hasMore}
        />
      ))}
      {history.hasMore ? (
        <Button variant="subtle" alignSelf="center" loading={history.isLoadingMore} onPress={history.loadMore}>
          Ver más registros
        </Button>
      ) : null}
    </>
  );
}

/**
 * Hoja de peso de un ejercicio (la variante del catálogo, compartida entre planes): el +/- de 2,5 kg y el número, que
 * también se escribe (coma, hasta 2 decimales; "—" si no tiene peso), "Quitar peso" (solo con peso, sin confirmar, no
 * toca el historial), el historial paginado (de a 5, "Ver más registros") y "Guardar peso", que espera un número
 * válido y distinto del actual. En un plan archivado es de solo lectura: el aviso, el peso actual y el historial. Va en
 * un `Modal` con `Sheet` y `SheetFrame`, como `AddMediaSheet`; el padre la remonta con `key` en cada apertura. Un
 * error deja la hoja abierta con el mensaje y `onClosed` llega con el Modal ya oculto, cuando un toast queda a la vista.
 */
export function WeightSheet({
  open,
  onOpenChange,
  exercise,
  weekday,
  readOnly,
  onSave,
  onClear,
  onClosed,
}: WeightSheetProps) {
  const previous = exercise.currentWeightKg;
  const [text, setText] = useState(previous === null ? '' : weightInputText(previous));
  const [visible, setVisible] = useState(open);
  if (open && !visible) setVisible(true);
  const history = useGymWeightHistory(exercise.id);
  const { mutate: revalidateHistory } = history;

  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    if (open || !visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onClosedRef.current?.();
    }, SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [open, visible]);

  const write = useCallback(
    async (weightKg: number | null) => {
      const result = await (weightKg === null ? onClear() : onSave(weightKg));
      if (result.status === 'done') await revalidateHistory().catch(() => undefined);
      return result;
    },
    [onClear, onSave, revalidateHistory]
  );
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { submitting, error, run } = useGymSheetSubmit<number | null>(write, close);

  const inputError = weightInputError(text);
  const next = parseWeightInput(text);
  const canSave = next !== null && inputError === null && next !== previous;
  const variant = `${exercise.name} ${formatSetsRepsShort(exercise.sets, exercise.reps)}`;

  const handleOpenChange = (value: boolean) => {
    if (!value && submitting) return;
    onOpenChange(value);
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
        snapPoints={[SNAP_POINT]}
        snapPointsMode="percent"
        disableDrag
        dismissOnSnapToBottom={!submitting}
        dismissOnOverlayPress={!submitting}
        zIndex={100_000}
        transition="medium"
      >
        <SheetOverlay />
        <SheetFrame>
          <XStack alignItems="center" gap={SPACING.sm}>
            <ExerciseTile />
            <YStack flex={1} gap={SPACING['3xs']}>
              <DisplayTitle size="md" numberOfLines={1}>
                {exercise.name}
              </DisplayTitle>
              <Paragraph color="dimmed" fontSize={FONT_SIZE.md} numberOfLines={1}>
                {[
                  formatSetsReps(exercise.sets, exercise.reps),
                  GYM_WEEKDAY_LABELS[weekday],
                  previous === null ? null : formatWeightKg(previous),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Paragraph>
            </YStack>
            <IconButton
              icon={XIcon}
              variant="light"
              accessibilityLabel="Cerrar"
              disabled={submitting}
              onPress={() => handleOpenChange(false)}
            />
          </XStack>
          {error ? <GymErrorBanner message={error.message} /> : null}
          {readOnly ? (
            <>
              <Banner color="accent" icon={ArchiveIcon}>
                Plan archivado: solo podés ver el peso y su historial. Para cargar uno nuevo, desarchivá el plan.
              </Banner>
              <YStack alignItems="center" padding={SPACING.sm} borderRadius={RADIUS.lg} backgroundColor="track">
                <Paragraph fontFamily="display" fontSize={FONT_SIZE.xl} fontWeight="800">
                  {previous === null ? '—' : formatWeight(previous)}
                </Paragraph>
                <Paragraph color="dimmed" fontSize={FONT_SIZE.md}>
                  {previous === null ? 'kg · sin peso' : 'kg · peso actual'}
                </Paragraph>
              </YStack>
            </>
          ) : (
            <WeightStepper text={text} previous={previous} error={inputError} onChangeText={setText} />
          )}
          <XStack alignItems="baseline" justifyContent="space-between">
            <SectionLabel>Historial</SectionLabel>
            {history.total > 0 ? (
              <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
                {history.total === 1 ? '1 registro' : `${history.total} registros`}
              </Paragraph>
            ) : null}
          </XStack>
          <Sheet.ScrollView flex={1} showsVerticalScrollIndicator={false} accessibilityLabel="Historial de peso">
            <WeightHistory history={history} readOnly={readOnly} />
          </Sheet.ScrollView>
          {readOnly ? null : (
            <>
              <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
                {previous === null
                  ? `El peso es el mismo en todos tus planes que usan ${variant}.`
                  : `Quitar el peso lo borra en todos tus planes que usan ${variant}. El historial se conserva.`}
              </Paragraph>
              {previous === null ? null : (
                <Button
                  fullWidth
                  variant="subtle"
                  color="destructive"
                  disabled={submitting}
                  onPress={() => void run(null)}
                >
                  Quitar peso
                </Button>
              )}
              <Button fullWidth size="lg" loading={submitting} disabled={!canSave} onPress={() => void run(next)}>
                Guardar peso
              </Button>
            </>
          )}
          {readOnly ? (
            <Button fullWidth variant="outline" size="lg" onPress={() => handleOpenChange(false)}>
              Cerrar
            </Button>
          ) : null}
        </SheetFrame>
      </Sheet>
    </Modal>
  );
}
