import type { WeatherCondition } from '@omni/shared/weather';
import type { Icon } from '@phosphor-icons/react';

import {
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudMoonIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  DropIcon,
  MoonIcon,
  SunIcon,
} from '@phosphor-icons/react';

const DAY_ICONS: Record<WeatherCondition, Icon> = {
  clear: SunIcon,
  'partly-cloudy': CloudSunIcon,
  cloudy: CloudIcon,
  fog: CloudFogIcon,
  drizzle: DropIcon,
  rain: CloudRainIcon,
  snow: CloudSnowIcon,
  storm: CloudLightningIcon,
};

const NIGHT_ICONS: Partial<Record<WeatherCondition, Icon>> = {
  clear: MoonIcon,
  'partly-cloudy': CloudMoonIcon,
};

/** Ícono de la condición; de noche (`isDay: false`) el despejado y el parcialmente nublado cambian a luna. */
export function getWeatherIcon(condition: WeatherCondition, isDay: boolean): Icon {
  return (!isDay && NIGHT_ICONS[condition]) || DAY_ICONS[condition];
}
