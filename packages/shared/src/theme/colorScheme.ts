import type { ProfileTheme } from '../users/schemas';
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
