import { Anchor, Button, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';

import { EmptyState, ErrorState, LoadingState, useDisplayStyles } from '@/shared/ui';

import { useCurrentWeather } from '../hooks/useCurrentWeather';
import { getWeatherIcon } from '../utils/weatherIcons';

import type { CurrentWeather } from '@omni/shared/weather';
import type { FC, ReactNode } from 'react';

import {
  formatTemperature,
  formatWeatherHeadline,
  formatWeatherRange,
  formatWeatherUpdatedAt,
  WEATHER_ATTRIBUTION,
  WEATHER_CONDITION_LABELS,
} from '@omni/shared/weather';
import { MapPinIcon } from '@phosphor-icons/react';

/** Atribución que exigen Open-Meteo (CC-BY 4.0) y OpenStreetMap (ODbL): "Datos: Open-Meteo · © OpenStreetMap". */
const WeatherAttribution: FC = () => (
  <Text size="xs" c="dimmed">
    {WEATHER_ATTRIBUTION.intro}{' '}
    <Anchor href={WEATHER_ATTRIBUTION.openMeteo.url} target="_blank" rel="noopener noreferrer" inherit>
      {WEATHER_ATTRIBUTION.openMeteo.label}
    </Anchor>
    {` ${WEATHER_ATTRIBUTION.separator} `}
    <Anchor href={WEATHER_ATTRIBUTION.openStreetMap.url} target="_blank" rel="noopener noreferrer" inherit>
      {WEATHER_ATTRIBUTION.openStreetMap.label}
    </Anchor>
  </Text>
);

/** Fila con el ícono de la condición, "[Ciudad] · Ahora", el estado, la temperatura y "Máx · Mín" (el widget 4×1 del canvas). */
const WeatherSummary: FC<{ weather: CurrentWeather }> = ({ weather }) => {
  const display = useDisplayStyles('md');
  const Icon = getWeatherIcon(weather.condition, weather.isDay);

  return (
    <Group wrap="nowrap" gap="sm" align="center">
      <ThemeIcon
        variant="transparent"
        bg="var(--mantine-color-surfaces-card)"
        c="var(--mantine-color-text-primary)"
        size="2.75rem"
        radius="full"
      >
        <Icon size="1.5rem" aria-hidden />
      </ThemeIcon>
      <Stack gap="3xs" flex={1} miw={0}>
        <Text size="xs" c="dimmed" fw={500} lineClamp={1}>
          {formatWeatherHeadline(weather.city)}
        </Text>
        <Text size="sm" fw={600}>
          {WEATHER_CONDITION_LABELS[weather.condition]}
        </Text>
      </Stack>
      <Stack gap="3xs" align="flex-end" style={{ flexShrink: 0 }}>
        <Text {...display} fz="1.75rem" lh="2rem" c="var(--mantine-color-text-primary)">
          {formatTemperature(weather.temperature)}
        </Text>
        <Text size="xs" c="dimmed" fw={500}>
          {formatWeatherRange(weather.min, weather.max)}
        </Text>
      </Stack>
    </Group>
  );
};

/** Card del widget de Clima: la misma superficie para el dato, la carga y la invitación a dar la ubicación. */
const WeatherSurface: FC<{ children: ReactNode }> = ({ children }) => (
  <Paper
    component="section"
    aria-label="Clima"
    withBorder
    bg="var(--mantine-color-surfaces-primary-light)"
    radius="lg"
    shadow="none"
    p="md"
  >
    {children}
  </Paper>
);

/**
 * Widget de Clima de Inicio: temperatura actual, condición con ícono, mínima y máxima del día y la ciudad cuando
 * existe, con la atribución obligatoria. Sin ubicación (permiso negado o sin posición) invita a darla y no llama a la
 * API; el error de la API ofrece reintentar y nunca se ve como vacío; un dato `stale` avisa a qué hora es. En todos
 * los estados es una card baja y autónoma: se monta tal cual en la grilla de `HomeMainCard`.
 */
export const WeatherCard: FC = () => {
  const { weather, state, retry, requestLocation, locationBlocked } = useCurrentWeather();

  if (state === 'no-location') {
    return (
      <WeatherSurface>
        <EmptyState
          compact
          icon={<MapPinIcon size="1.5rem" />}
          title={
            locationBlocked
              ? 'La ubicación está bloqueada. Habilitala desde el candado de la barra de direcciones'
              : 'Activá la ubicación para ver el clima'
          }
          action={
            <Button variant="default" size="xs" onClick={requestLocation}>
              Permitir ubicación
            </Button>
          }
        />
      </WeatherSurface>
    );
  }

  if (state === 'error') {
    return <ErrorState message="No se pudo cargar el clima" onRetry={retry} />;
  }

  if (state === 'loading' || !weather) {
    return (
      <WeatherSurface>
        <LoadingState variant="skeleton" rows={1} />
      </WeatherSurface>
    );
  }

  return (
    <WeatherSurface>
      <Stack gap="sm">
        <WeatherSummary weather={weather} />
        {weather.stale && (
          <Text size="xs" c="dimmed" role="status">
            Sin datos nuevos: último dato de las {formatWeatherUpdatedAt(weather.updatedAt)}
          </Text>
        )}
        <WeatherAttribution />
      </Stack>
    </WeatherSurface>
  );
};
