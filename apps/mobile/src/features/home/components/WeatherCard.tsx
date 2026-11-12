import { DISPLAY, FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import {
  formatTemperature,
  formatWeatherHeadline,
  formatWeatherRange,
  formatWeatherUpdatedAt,
  WEATHER_ATTRIBUTION,
  WEATHER_CONDITION_LABELS,
} from '@omni/shared/weather';
import { MapPinIcon } from 'phosphor-react-native';
import { Linking, Pressable } from 'react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { Button, EmptyState, ErrorState, LoadingState, SectionCard, Title } from '@/shared/ui';

import { useCurrentWeather } from '../hooks/useCurrentWeather';
import { getWeatherIcon } from '../utils/weatherIcons';

import type { CurrentWeather } from '@omni/shared/weather';

const CHIP_SIZE = 44;

/** Enlace de la atribución: texto chico en `dimmed` y subrayado, con área de toque ampliada. */
function AttributionLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => {})}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Paragraph fontSize={FONT_SIZE.sm} color="$dimmed" textDecorationLine="underline">
        {label}
      </Paragraph>
    </Pressable>
  );
}

/** Atribución que exigen Open-Meteo (CC-BY 4.0) y OpenStreetMap (ODbL): "Datos: Open-Meteo · © OpenStreetMap". */
function WeatherAttribution() {
  return (
    <XStack gap={SPACING['3xs']} alignItems="center" flexWrap="wrap">
      <Paragraph fontSize={FONT_SIZE.sm} color="$dimmed">
        {WEATHER_ATTRIBUTION.intro}
      </Paragraph>
      <AttributionLink {...WEATHER_ATTRIBUTION.openMeteo} />
      <Paragraph fontSize={FONT_SIZE.sm} color="$dimmed">
        {WEATHER_ATTRIBUTION.separator}
      </Paragraph>
      <AttributionLink {...WEATHER_ATTRIBUTION.openStreetMap} />
    </XStack>
  );
}

/** Fila con el ícono de la condición, "[Ciudad] · Ahora", el estado, la temperatura y "Máx · Mín" (widget 4×1 del canvas). */
function WeatherSummary({ weather }: { weather: CurrentWeather }) {
  const colors = useSemanticColors();
  const Icon = getWeatherIcon(weather.condition, weather.isDay);
  const { fontSize, lineHeight, fontWeight, letterSpacing } = DISPLAY.md;
  const headline = formatWeatherHeadline(weather.city);
  const condition = WEATHER_CONDITION_LABELS[weather.condition];
  const range = formatWeatherRange(weather.min, weather.max);

  return (
    <XStack
      gap={SPACING.sm}
      alignItems="center"
      accessible
      accessibilityLabel={`Clima. ${headline}, ${condition}, ${weather.temperature} grados. ${range}`}
    >
      <YStack
        width={CHIP_SIZE}
        height={CHIP_SIZE}
        borderRadius={RADIUS.full}
        backgroundColor="$primarySurface"
        alignItems="center"
        justifyContent="center"
      >
        <Icon size={26} color={colors.primary} />
      </YStack>
      <YStack flex={1} gap={SPACING['3xs']}>
        <Paragraph fontSize={FONT_SIZE.sm} color="$dimmed" fontWeight="500" numberOfLines={1}>
          {headline}
        </Paragraph>
        <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
          {condition}
        </Paragraph>
      </YStack>
      <YStack alignItems="flex-end" gap={SPACING['3xs']}>
        <Paragraph
          fontFamily="$display"
          fontSize={fontSize}
          lineHeight={lineHeight}
          fontWeight={String(fontWeight) as '700'}
          letterSpacing={letterSpacing}
        >
          {formatTemperature(weather.temperature)}
        </Paragraph>
        <Paragraph fontSize={FONT_SIZE.sm} color="$dimmed" fontWeight="500">
          {range}
        </Paragraph>
      </YStack>
    </XStack>
  );
}

/**
 * Widget de Clima de Inicio (= `WeatherCard` de web): temperatura actual, condición con ícono, mínima y máxima del día
 * y la ciudad cuando existe, con la atribución obligatoria. Sin ubicación (permiso negado o sin posición) invita a
 * darla, o a abrir los ajustes si el sistema ya no deja preguntar, y no llama a la API; el error de la API ofrece
 * reintentar y nunca se ve como vacío; un dato `stale` avisa a qué hora es. Es una card autónoma que `HomeScreen`
 * monta debajo de las efemérides.
 */
export function WeatherCard() {
  const { weather, state, retry, requestLocation, canAskLocationAgain } = useCurrentWeather();

  if (state === 'ready' && weather) {
    return (
      <SectionCard>
        <WeatherSummary weather={weather} />
        {weather.stale && (
          <Paragraph fontSize={FONT_SIZE.sm} color="$dimmed" accessibilityLiveRegion="polite">
            Sin datos nuevos: último dato de las {formatWeatherUpdatedAt(weather.updatedAt)}
          </Paragraph>
        )}
        <WeatherAttribution />
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <Title order={4} fontWeight="600">
        Clima
      </Title>
      {state === 'no-location' ? (
        <EmptyState
          icon={MapPinIcon}
          title="Activá la ubicación para ver el clima"
          action={
            <Button variant="outline" fullWidth onPress={requestLocation}>
              {canAskLocationAgain ? 'Permitir ubicación' : 'Abrir ajustes'}
            </Button>
          }
        />
      ) : state === 'error' ? (
        <ErrorState message="No se pudo cargar el clima" onRetry={retry} />
      ) : (
        <LoadingState variant="skeleton" rows={1} />
      )}
    </SectionCard>
  );
}
