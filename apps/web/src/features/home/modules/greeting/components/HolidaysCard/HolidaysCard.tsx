import { FC, FocusEvent, KeyboardEvent, useId, useState } from 'react';
import {
  ActionIcon,
  getGradient,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineTheme,
} from '@mantine/core';

import { ErrorState } from '@/shared/ui';
import { GRADIENTS } from '@/theme/gradients';
import { useIsDark } from '@/theme/useIsDark';

import { useTodayHolidays } from '../../hooks';
import { HolidayProgress } from './HolidayProgress';
import { useHolidayCarousel } from './utils';

import { ArrowSquareOutIcon, ConfettiIcon } from '@phosphor-icons/react';

const HOLIDAY_DURATION = 3000;

export const HolidaysCard: FC = () => {
  const { holidays, isLoading, error } = useTodayHolidays();
  const isDark = useIsDark();
  const theme = useMantineTheme();
  const currentItemId = useId();
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);

  const { currentIndex, currentItem, isAutoPlaying, next } = useHolidayCarousel(holidays.items, HOLIDAY_DURATION, {
    paused: hovered || focusWithin,
  });

  if (error) {
    return <ErrorState message="No se pudieron cargar las efemérides de hoy" />;
  }

  if (isLoading) {
    return <Skeleton w="100%" h="3.75rem" role="status" aria-busy="true" aria-label="Cargando efemérides" />;
  }

  const isCarousel = holidays.items.length > 1;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    next();
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocusWithin(false);
    }
  };

  return (
    <Paper
      withBorder
      bg={getGradient(isDark ? GRADIENTS.cardDark : GRADIENTS.cardLight, theme)}
      p="none"
      pos="relative"
      style={{ cursor: isCarousel ? 'pointer' : undefined, overflow: 'hidden' }}
      onClick={isCarousel ? next : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={handleBlur}
    >
      <Group align="flex-start" wrap="nowrap" gap="sm" p="md">
        <ThemeIcon variant="white" c="var(--mantine-primary-color-filled)" size="lg" radius="md">
          <ConfettiIcon size="1.25rem" />
        </ThemeIcon>

        <Stack
          gap="2xs"
          flex={1}
          {...(isCarousel && {
            role: 'button',
            tabIndex: 0,
            'aria-label': 'Siguiente efeméride',
            'aria-describedby': currentItem ? currentItemId : undefined,
            onKeyDown: handleKeyDown,
          })}
        >
          <Title order={5} c="var(--mantine-color-text-black)">
            Efemérides de hoy
          </Title>

          {holidays.items.length === 0 && (
            <Text size="xs" fw={600} c="var(--mantine-color-text-black)">
              Hoy no hay efemérides registradas
            </Text>
          )}

          {currentItem && (
            <Text id={currentItemId} size="xs" fw={600} c="var(--mantine-color-text-black)">
              {currentItem.title}
              {currentItem.isArgentina ? ' · en Argentina' : ''}
            </Text>
          )}
        </Stack>

        <ActionIcon
          component="a"
          href={holidays.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="transparent"
          c="var(--mantine-color-text-black)"
          ml="auto"
          onClick={event => event.stopPropagation()}
          onKeyDown={event => event.stopPropagation()}
          aria-label="Ver efemérides de hoy en Wikipedia"
        >
          <ArrowSquareOutIcon size="1rem" />
        </ActionIcon>
      </Group>
      {isCarousel && (
        <HolidayProgress key={`${currentIndex}-${isAutoPlaying}`} duration={HOLIDAY_DURATION} running={isAutoPlaying} />
      )}
    </Paper>
  );
};
