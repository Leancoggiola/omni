import { useRef, useState } from 'react';

import { Banner, Button, FormSheet, getErrorMessage } from '@/shared/ui';

import { getFriendErrors, type FriendFormErrors } from '../utils/friendErrors';
import { FriendFields } from './FriendFields';

import type { FriendFormValues, SplitFriend, UpdateSplitFriendPayload } from '@omni/shared/split-expenses';

type EditFriendSheetProps = {
  friend: SplitFriend;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (friendId: string, payload: UpdateSplitFriendPayload) => Promise<unknown>;
  onSaved: () => void;
  onDelete: (friend: SplitFriend) => void;
  onClosed: () => void;
};

/**
 * Edición de un amigo, con "Eliminar amigo" adentro (la confirmación la pide quien la abre, ya con la hoja cerrada).
 * "Guardar cambios" arranca deshabilitado. Quien la usa la remonta con `key` en cada apertura.
 */
export function EditFriendSheet({
  friend,
  open,
  onOpenChange,
  onSave,
  onSaved,
  onDelete,
  onClosed,
}: EditFriendSheetProps) {
  const initial = { name: friend.name, alias: friend.alias ?? '' };
  const [values, setValues] = useState<FriendFormValues>(initial);
  const [errors, setErrors] = useState<FriendFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const dirty = values.name !== initial.name || values.alias !== initial.alias;

  const handleChange = (next: FriendFormValues) => {
    setValues(next);
    setErrors({});
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!dirty || busy.current) return;
    const found = getFriendErrors(values);
    if (found) {
      setErrors(found);
      return;
    }
    busy.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSave(friend.id, { name: values.name.trim(), alias: values.alias.trim() });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo actualizar el amigo'));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Editar amigo" busy={submitting} onClosed={onClosed}>
      {submitError ? <Banner color="destructive">{submitError}</Banner> : null}
      <FriendFields values={values} errors={errors} onChange={handleChange} />
      <Button fullWidth size="lg" loading={submitting} disabled={!dirty} onPress={() => void handleSubmit()}>
        Guardar cambios
      </Button>
      <Button
        fullWidth
        size="lg"
        variant="outline"
        color="destructive"
        disabled={submitting}
        onPress={() => onDelete(friend)}
      >
        Eliminar amigo
      </Button>
    </FormSheet>
  );
}
