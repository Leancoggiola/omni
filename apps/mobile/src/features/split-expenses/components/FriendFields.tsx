import { SPLIT_FRIEND_ALIAS_MAX, SPLIT_FRIEND_ALIAS_MIN, SPLIT_FRIEND_NAME_MAX } from '@omni/shared/split-expenses';

import { TextField } from '@/shared/ui';

import type { FriendFormErrors } from '../utils/friendErrors';
import type { FriendFormValues } from '@omni/shared/split-expenses';

export const ALIAS_HINT = `Entre ${SPLIT_FRIEND_ALIAS_MIN} y ${SPLIT_FRIEND_ALIAS_MAX} caracteres: letras, números, puntos y guiones.`;

type FriendFieldsProps = {
  values: FriendFormValues;
  errors: FriendFormErrors;
  disabled?: boolean;
  onChange: (values: FriendFormValues) => void;
};

/** Nombre y alias de un amigo, los dos obligatorios: los usan el alta y la edición. */
export function FriendFields({ values, errors, disabled = false, onChange }: FriendFieldsProps) {
  return (
    <>
      <TextField
        label="Nombre"
        required
        placeholder="Nombre del amigo"
        maxLength={SPLIT_FRIEND_NAME_MAX}
        value={values.name}
        onChangeText={(name: string) => onChange({ ...values, name })}
        error={errors.name}
        disabled={disabled}
      />
      <TextField
        label="Alias"
        required
        placeholder="Ej: martin.rios"
        description={ALIAS_HINT}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={SPLIT_FRIEND_ALIAS_MAX}
        value={values.alias}
        onChangeText={(alias: string) => onChange({ ...values, alias })}
        error={errors.alias}
        disabled={disabled}
      />
    </>
  );
}
