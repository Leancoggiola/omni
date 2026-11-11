import { Text, Title, type TitleProps } from '@mantine/core';

import { useDisplayStyles } from './useDisplayStyles';

import type { FC } from 'react';

interface AccentTitleProps extends Omit<TitleProps, 'children'> {
  title: string;
  accent?: string;
  /** Estilo `display` del tema; por defecto `xl`. */
  display?: Parameters<typeof useDisplayStyles>[0];
}

/** Parte `title` en [antes, acento, después]; sin acento válido, el título entero queda sin resaltar. */
function splitAccent(title: string, accent?: string): [string, string, string] {
  const clean = title.trim().replace(/\s+/g, ' ');
  const words = clean.match(/[^\s\p{P}]+(?:[-'][^\s\p{P}]+)*/gu) ?? [];
  const target = accent ?? words[words.length - 1];
  if (words.length < 2 || !target) return [clean, '', ''];
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const whole = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})(?![\\p{L}\\p{N}])`, 'gu');
  const found = [...clean.matchAll(whole)].pop();
  if (!found) return [clean, '', ''];
  const index = found.index + (found[1]?.length ?? 0);
  return [clean.slice(0, index), target, clean.slice(index + target.length)];
}

/**
 * Título de v2 en `display` con una palabra en `primary`, sin itálica. `accent` es esa palabra (por defecto, la
 * última) y tiene que aparecer tal cual en `title`, como palabra completa (una subcadena de otra palabra no cuenta).
 * Si no aparece, o si el título tiene una sola palabra, no se resalta nada.
 */
export const AccentTitle: FC<AccentTitleProps> = ({ title, accent, display = 'xl', ...props }) => {
  const styles = useDisplayStyles(display);
  const [before, highlighted, after] = splitAccent(title, accent);

  return (
    <Title {...styles} {...props}>
      {before}
      {highlighted && (
        <Text span inherit c="var(--mantine-color-text-primary)">
          {highlighted}
        </Text>
      )}
      {after}
    </Title>
  );
};
