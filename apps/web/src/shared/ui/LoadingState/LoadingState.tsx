import { FC } from 'react';
import { Center, Loader, MantineSize } from '@mantine/core';

interface LoadingStateProps {
  size?: MantineSize;
  /** Vertical padding, matches the surrounding block spacing. */
  py?: MantineSize;
}

export const LoadingState: FC<LoadingStateProps> = ({ size = 'md', py = 'xl' }) => (
  <Center py={py}>
    <Loader size={size} />
  </Center>
);
