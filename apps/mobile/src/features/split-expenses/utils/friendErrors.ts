import { friendFormSchema, type FriendFormValues } from '@omni/shared/split-expenses';

export type FriendFormErrors = Partial<Record<keyof FriendFormValues, string>>;

/** El primer error de cada campo del formulario de amigo según el schema compartido, o `null` si es válido. */
export function getFriendErrors(values: FriendFormValues): FriendFormErrors | null {
  const result = friendFormSchema.safeParse(values);
  if (result.success) return null;
  const errors: FriendFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] === 'alias' ? 'alias' : 'name';
    errors[field] ??= issue.message;
  }
  return errors;
}
