import { profileThemeSchema } from '../users/schemas';

import type { ProfileTheme } from '../users/types';
import type { Role, SessionUser } from './types';

type SessionUserSource = {
  username: string;
  name: string;
  email: string | null;
  role: Role;
  avatarUrl: string | null;
  preferences: { theme: string } | null;
};

/** Mapea un usuario de BD o perfil a la forma expuesta en endpoints de auth. */
export function toSessionUser(user: SessionUserSource): SessionUser {
  return {
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    theme: toProfileTheme(user.preferences?.theme),
  };
}

/** La columna es texto libre en la base: un valor desconocido no debe llegar a los clientes. */
function toProfileTheme(value: string | undefined): ProfileTheme {
  const parsed = profileThemeSchema.safeParse(value);
  return parsed.success ? parsed.data : 'light';
}
