import { FC, FocusEvent, KeyboardEvent, useId, useState } from 'react';
import { ActionIcon, Group, Paper, Skeleton, Stack, Text, ThemeIcon, Title } from '@mantine/core';

import { ErrorState } from '@/shared/ui';

import { useHolidayCarousel } from '../../hooks/useHolidayCarousel';
import { useTodayHolidays } from '../../hooks/useTodayHolidays';
import { HolidayProgress } from './HolidayProgress';

import { HOLIDAY_CAROUSEL_DURATION_MS } from '@omni/shared/holidays';
import { ArrowSquareOutIcon, ConfettiIcon } from '@phosphor-icons/react';

export const HolidaysCard: FC = () => {
  const { holidays, isLoading, error, mutate } = useTodayHolidays();
  const currentItemId = useId();
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);

  const { currentIndex, currentItem, isAutoPlaying, next } = useHolidayCarousel(
    holidays.items,
    HOLIDAY_CAROUSEL_DURATION_MS,
    {
      paused: hovered || focusWithin,
    }
  );

  if (error) {
    return <ErrorState message="No se pudieron cargar las efemérides de hoy" onRetry={() => mutate()} />;
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
      bg="var(--mantine-color-surfaces-primary-light)"
      radius="lg"
      shadow="none"
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
        <ThemeIcon
          variant="transparent"
          bg="var(--mantine-color-surfaces-card)"
          c="var(--mantine-color-text-primary)"
          size="2.75rem"
          radius="full"
        >
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
          <Title order={5} fz="md" lh="1.5rem" fw={700}>
            Efemérides de hoy
          </Title>

          {holidays.items.length === 0 && (
            <Text size="sm" fw={600}>
              Hoy no hay efemérides registradas
            </Text>
          )}

          {currentItem && (
            <Text id={currentItemId} size="sm" fw={600}>
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
          size="2.75rem"
          radius="full"
          ml="auto"
          onClick={event => event.stopPropagation()}
          onKeyDown={event => event.stopPropagation()}
          aria-label="Ver efemérides de hoy en Wikipedia"
        >
          <ArrowSquareOutIcon size="1rem" />
        </ActionIcon>
      </Group>
      {isCarousel && (
        <HolidayProgress
          key={`${currentIndex}-${isAutoPlaying}`}
          duration={HOLIDAY_CAROUSEL_DURATION_MS}
          running={isAutoPlaying}
        />
      )}
    </Paper>
  );
};
