import { useComputedColorScheme } from '@mantine/core';

export const useIsDark = () => {
  const colorScheme = useComputedColorScheme('light');

  return colorScheme === 'dark';
};
