import {
  createInitialNewGatheringValues,
  GATHERING_NAME_MAX,
  newGatheringFormSchema,
  toCreateGatheringPayload,
} from '@omni/shared/split-expenses';
import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { CalendarBlankIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { XStack, YStack } from 'tamagui';

import { Banner, Button, FormSheet, getErrorMessage, Paragraph, TextField } from '@/shared/ui';

import { maskDateInput, parseOtherDate, relativeDateKey, type DateChoice } from '../utils/gatheringDate';
import { ChoiceChip } from './ChoiceChip';
import { ParticipantPicker } from './ParticipantPicker';

import type { CreateGatheringPayload, GatheringParticipantDraft } from '@omni/shared/split-expenses';

type NewGatheringSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CreateGatheringPayload) => Promise<{ id: string }>;
  onCreated: (gatheringId: string) => void;
  onClosed?: () => void;
};

type FormErrors = { name?: string; date?: string; participants?: string };

const DATE_OPTIONS: { value: DateChoice; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'other', label: 'Otra' },
];

/**
 * Hoja "Nueva juntada": nombre, fecha (Hoy, Ayer u Otra, que abre un campo `dd/mm/aaaa` sin fechas futuras) y
 * participantes. Las validaciones corren al enviar; un error de la API queda arriba sin perder lo cargado. Quien la usa
 * la remonta con `key` en cada apertura.
 */
export function NewGatheringSheet({ open, onOpenChange, onCreate, onCreated, onClosed }: NewGatheringSheetProps) {
  const [name, setName] = useState('');
  const [dateChoice, setDateChoice] = useState<DateChoice>('today');
  const [otherDate, setOtherDate] = useState('');
  const [participants, setParticipants] = useState<GatheringParticipantDraft[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const nextKey = useRef(0);
  const dirty = name !== '' || participants.length > 0 || dateChoice !== 'today';

  const changeParticipants = (next: GatheringParticipantDraft[]) => {
    setParticipants(next);
    setErrors(current => ({ ...current, participants: undefined }));
    setSubmitError(null);
  };

  const addParticipant = (friendId: string | null, displayName: string) => {
    nextKey.current += 1;
    changeParticipants([...participants, { key: `participant-${nextKey.current}`, friendId, displayName }]);
  };

  const toggleFriend = (friendId: string, displayName: string) => {
    if (participants.some(participant => participant.friendId === friendId)) {
      changeParticipants(participants.filter(participant => participant.friendId !== friendId));
    } else {
      addParticipant(friendId, displayName);
    }
  };

  const handleSubmit = async () => {
    if (!dirty || busy.current) return;
    const picked = dateChoice === 'other' ? parseOtherDate(otherDate) : { date: relativeDateKey(dateChoice) };
    const base = createInitialNewGatheringValues();
    const values = { name, date: picked.date ?? base.date, participants };
    const result = newGatheringFormSchema.safeParse(values);
    const found: FormErrors = { date: picked.error };
    if (!result.success) {
      for (const issue of result.error.issues) {
        if (issue.path[0] === 'name') found.name ??= issue.message;
        if (issue.path[0] === 'participants') found.participants ??= issue.message;
      }
    }
    setErrors(found);
    if (!result.success || picked.error !== undefined) return;

    busy.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const gathering = await onCreate(toCreateGatheringPayload(values));
      onCreated(gathering.id);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo crear la juntada'));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Nueva juntada" busy={submitting} onClosed={onClosed}>
      {submitError ? <Banner color="destructive">{submitError}</Banner> : null}
      <TextField
        label="Nombre"
        required
        placeholder="Asado del sábado"
        maxLength={GATHERING_NAME_MAX}
        value={name}
        onChangeText={(text: string) => {
          setName(text);
          setErrors(current => ({ ...current, name: undefined }));
          setSubmitError(null);
        }}
        error={errors.name}
      />
      <YStack gap={SPACING.xs}>
        <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
          Fecha
        </Paragraph>
        <XStack flexWrap="wrap" gap={SPACING.xs}>
          {DATE_OPTIONS.map(option => (
            <ChoiceChip
              key={option.value}
              label={option.label}
              selected={dateChoice === option.value}
              leftIcon={option.value === 'other' ? CalendarBlankIcon : undefined}
              onPress={() => {
                setDateChoice(option.value);
                setErrors(current => ({ ...current, date: undefined }));
              }}
            />
          ))}
        </XStack>
      </YStack>
      {dateChoice === 'other' ? (
        <TextField
          label="Día de la juntada"
          placeholder="dd/mm/aaaa"
          keyboardType="number-pad"
          maxLength={10}
          value={otherDate}
          onChangeText={(text: string) => {
            setOtherDate(maskDateInput(text));
            setErrors(current => ({ ...current, date: undefined }));
          }}
          error={errors.date}
        />
      ) : null}
      <ParticipantPicker
        participants={participants}
        error={errors.participants}
        onToggleFriend={toggleFriend}
        onAddNew={displayName => addParticipant(null, displayName)}
        onRemove={key => changeParticipants(participants.filter(participant => participant.key !== key))}
      />
      <Button fullWidth size="lg" loading={submitting} disabled={!dirty} onPress={() => void handleSubmit()}>
        Crear juntada
      </Button>
    </FormSheet>
  );
}
