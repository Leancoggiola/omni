import { INITIAL_FRIEND_FORM_VALUES, toCreateFriendPayload } from '@omni/shared/split-expenses';
import { SPACING } from '@omni/shared/theme';
import { useRef, useState } from 'react';
import { YStack } from 'tamagui';

import { Banner, Button, FormFields, getErrorMessage, notifySuccess } from '@/shared/ui';

import { getFriendErrors, type FriendFormErrors } from '../utils/friendErrors';
import { FriendFields } from './FriendFields';

import type { CreateSplitFriendPayload, FriendFormValues } from '@omni/shared/split-expenses';

type NewFriendFormProps = {
  onCreate: (payload: CreateSplitFriendPayload) => Promise<unknown>;
};

/** Alta de un amigo arriba de la lista. Un error de la API queda encima de los campos, sin borrar lo escrito. */
export function NewFriendForm({ onCreate }: NewFriendFormProps) {
  const [values, setValues] = useState<FriendFormValues>(INITIAL_FRIEND_FORM_VALUES);
  const [errors, setErrors] = useState<FriendFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const dirty = values.name !== '' || values.alias !== '';

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
      await onCreate(toCreateFriendPayload(values));
      setValues(INITIAL_FRIEND_FORM_VALUES);
      notifySuccess('Amigo guardado');
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo guardar el amigo'));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return (
    <FormFields>
      <YStack gap={SPACING.sm}>
        {submitError ? <Banner color="destructive">{submitError}</Banner> : null}
        <FriendFields values={values} errors={errors} onChange={handleChange} />
        <Button fullWidth loading={submitting} disabled={!dirty} onPress={() => void handleSubmit()}>
          Agregar
        </Button>
      </YStack>
    </FormFields>
  );
}
