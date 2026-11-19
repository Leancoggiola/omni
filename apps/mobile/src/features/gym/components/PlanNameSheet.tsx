import { GYM_PLAN_NAME_MAX } from '@omni/shared/gym';
import { useCallback, useState } from 'react';

import { Button, FormSheet, TextField } from '@/shared/ui';

import { useGymSheetSubmit } from '../hooks/useGymSheetSubmit';
import { GymErrorBanner } from './GymErrorBanner';

import type { GymSubmitResult } from '../utils/gymSubmit';

type PlanNameSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onSubmit: (name: string) => Promise<GymSubmitResult>;
  onClosed?: () => void;
};

type FormProps = {
  initialName?: string;
  submitting: boolean;
  onSubmit: (name: string) => Promise<void>;
};

function PlanNameForm({ initialName, submitting, onSubmit }: FormProps) {
  const [name, setName] = useState(initialName ?? '');
  const [error, setError] = useState<string | null>(null);
  const dirty = name !== (initialName ?? '');

  const handleSubmit = async () => {
    if (!dirty || submitting) return;
    if (name.trim() === '') {
      setError('Ponele un nombre al plan');
      return;
    }
    setError(null);
    await onSubmit(name.trim());
  };

  return (
    <>
      <TextField
        label="Nombre"
        required
        description={`${name.length}/${GYM_PLAN_NAME_MAX}`}
        placeholder="Ej: Fuerza 3 días"
        maxLength={GYM_PLAN_NAME_MAX}
        value={name}
        onChangeText={(text: string) => {
          setName(text);
          setError(null);
        }}
        error={error ?? undefined}
        onSubmitEditing={() => void handleSubmit()}
        returnKeyType="done"
      />
      <Button fullWidth size="lg" loading={submitting} disabled={!dirty} onPress={() => void handleSubmit()}>
        {initialName === undefined ? 'Crear plan' : 'Guardar nombre'}
      </Button>
    </>
  );
}

/**
 * Hoja con el nombre del plan: sin `initialName` es el alta ("Nuevo plan"); con él, renombrar. `onSubmit` devuelve el
 * resultado: un error deja la hoja abierta con el mensaje. El padre la remonta con `key` en cada apertura, así arranca
 * limpia, y avisa el éxito en `onClosed` (con el Modal visible los toasts quedan tapados).
 */
export function PlanNameSheet({ open, onOpenChange, initialName, onSubmit, onClosed }: PlanNameSheetProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { submitting, error, run } = useGymSheetSubmit<string>(onSubmit, close);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={initialName === undefined ? 'Nuevo plan' : 'Renombrar plan'}
      busy={submitting}
      onClosed={onClosed}
    >
      {error ? <GymErrorBanner message={error.message} /> : null}
      <PlanNameForm initialName={initialName} submitting={submitting} onSubmit={run} />
    </FormSheet>
  );
}
