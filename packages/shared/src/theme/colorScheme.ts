import { profileThemeSchema, type ProfileTheme } from '../users/schemas';
import type { ColorScheme } from './tokens';

interface ResolveColorSchemeInput<TSystem extends string> {
  override: ColorScheme | null;
  profileTheme: ProfileTheme | null;
  system: TSystem;
}

/**
 * Tema efectivo: el override del toggle pisa al del perfil; sin sesión (`profileTheme` null) o con tema `auto` se
 * sigue `system`. Mobile pasa el esquema del sistema; web pasa `'auto'` y deja que Mantine lo resuelva.
 */
export function resolveColorScheme<TSystem extends string = ColorScheme>({
  override,
  profileTheme,
  system,
}: ResolveColorSchemeInput<TSystem>): ColorScheme | TSystem {
  if (override) return override;
  if (profileTheme === null || profileTheme === 'auto') return system;
  return profileTheme;
}

export const THEME_FADE_MS = 250;

/**
 * Lee la pista de tema que cada cliente guarda en el dispositivo (el tema del perfil de la última sesión, para pintar
 * el primer cuadro antes de tener la sesión): `null` si no hay o no es un tema válido.
 */
export function parseColorSchemeHint(value: string | null | undefined): ProfileTheme | null {
  const parsed = profileThemeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
