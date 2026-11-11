export const WEATHER_CONDITIONS = [
  'clear',
  'partly-cloudy',
  'cloudy',
  'fog',
  'drizzle',
  'rain',
  'snow',
  'storm',
] as const;

export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

export const WEATHER_CONDITION_LABELS: Record<WeatherCondition, string> = {
  clear: 'Despejado',
  'partly-cloudy': 'Parcialmente nublado',
  cloudy: 'Nublado',
  fog: 'Niebla',
  drizzle: 'Llovizna',
  rain: 'Lluvia',
  snow: 'Nieve',
  storm: 'Tormenta',
};
