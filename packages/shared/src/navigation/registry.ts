export type NavPlatform = 'web' | 'mobile';

export const NAV_KEYS = [
  'home',
  'media',
  'gym',
  'expenses',
  'pc-control',
  'pantry',
  'split-expenses',
  'profile',
  'admin',
] as const;

export type NavKey = (typeof NAV_KEYS)[number];

export interface NavEntry {
  label: string;
  /** Etiqueta de la tab bar mobile, donde el ancho no alcanza para `label`. */
  shortLabel?: string;
  /** Misma ruta en React Router (web) y Expo Router (mobile). */
  path: string;
  /**
   * Clientes donde la pantalla real existe; en el resto el módulo se muestra como "Próximamente".
   * No dice si hay ruta: Alacena es tab en mobile (`MOBILE_TAB_KEYS`) con un placeholder y sigue sin
   * estar disponible.
   */
  availableOn: readonly NavPlatform[];
}

/**
 * Registro de módulos de navegación: labels, rutas y disponibilidad por cliente. Los íconos los
 * pone cada cliente (`Record<NavKey, Icon>`) con el mismo nombre de Phosphor en los dos.
 */
export const NAV_REGISTRY: Record<NavKey, NavEntry> = {
  home: { label: 'Inicio', path: '/', availableOn: ['web', 'mobile'] },
  media: { label: 'Películas', shortLabel: 'Media', path: '/media', availableOn: ['web', 'mobile'] },
  gym: { label: 'Gimnasio', path: '/gym', availableOn: [] },
  expenses: { label: 'Gastos', path: '/expenses', availableOn: [] },
  'pc-control': { label: 'PC Control', path: '/pc-control', availableOn: [] },
  pantry: { label: 'Alacena', path: '/pantry', availableOn: [] },
  'split-expenses': {
    label: 'Dividir gastos',
    path: '/split-expenses',
    availableOn: ['web'],
  },
  profile: { label: 'Perfil', path: '/profile', availableOn: ['web', 'mobile'] },
  admin: { label: 'Administración', path: '/admin', availableOn: ['web'] },
};

/** Orden de los módulos: navbar de web y lista de "Más" en mobile. */
export const MAIN_NAV_ORDER = [
  'home',
  'media',
  'gym',
  'expenses',
  'pc-control',
  'pantry',
  'split-expenses',
  'profile',
] as const satisfies readonly NavKey[];

/** Sección de administración: cada cliente la muestra solo al rol ADMIN (el registro no filtra por rol). */
export const ADMIN_NAV_ORDER = ['admin'] as const satisfies readonly NavKey[];

/** Tabs de mobile antes de "Más". Alacena es tab aunque todavía no exista (#48). */
export const MOBILE_TAB_KEYS = ['home', 'media', 'pantry'] as const satisfies readonly NavKey[];

export const isNavAvailable = (key: NavKey, platform: NavPlatform): boolean =>
  NAV_REGISTRY[key].availableOn.includes(platform);
