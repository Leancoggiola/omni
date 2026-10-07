import { FC } from 'react';
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

  const { currentIndex, currentItem, next } = useHolidayCarousel(holidays.items, HOLIDAY_DURATION);

  if (error) {
    return <ErrorState message="No se pudieron cargar las efemérides de hoy" />;
  }

  if (isLoading) {
    return <Skeleton w="100%" h="3.75rem" />;
  }

  return (
    <Paper
      withBorder
      bg={getGradient(isDark ? GRADIENTS.cardDark : GRADIENTS.cardLight, theme)}
      p="none"
      onClick={next}
      pos="relative"
      style={{ cursor: holidays.items.length > 1 ? 'pointer' : undefined, overflow: 'hidden' }}
    >
      <Group align="flex-start" wrap="nowrap" gap="sm" p="md">
        <ThemeIcon variant="white" c="brand.7" size="lg" radius="md">
          <ConfettiIcon size="1.25rem" />
        </ThemeIcon>

        <Stack gap="2xs" flex={1}>
          <Title order={5} c="black">
            Efemérides de hoy
          </Title>

          {holidays.items.length === 0 && (
            <Text size="xs" fw={600} c="black">
              Hoy no hay efemérides registradas
            </Text>
          )}

          {currentItem && (
            <Text size="xs" fw={600} c="black">
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
          ml="auto"
          onClick={event => event.stopPropagation()}
          aria-label="Ver efemérides de hoy en Wikipedia"
        >
          <ArrowSquareOutIcon size="1rem" />
        </ActionIcon>
      </Group>
      {holidays.items.length > 1 && <HolidayProgress key={currentIndex} duration={HOLIDAY_DURATION} />}
    </Paper>
  );
};
