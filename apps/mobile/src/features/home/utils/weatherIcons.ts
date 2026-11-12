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
  type Icon,
} from 'phosphor-react-native';

import type { WeatherCondition } from '@omni/shared/weather';

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

/** Ícono de la condición (= `getWeatherIcon` de web); de noche el despejado y el parcialmente nublado pasan a luna. */
export function getWeatherIcon(condition: WeatherCondition, isDay: boolean): Icon {
  return (!isDay && NIGHT_ICONS[condition]) || DAY_ICONS[condition];
}
