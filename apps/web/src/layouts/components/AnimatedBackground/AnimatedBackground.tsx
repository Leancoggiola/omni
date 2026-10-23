import { Box } from '@mantine/core';

import type { FC } from 'react';

import './AnimatedBackground.scss';

export const AnimatedBackground: FC = () => (
  <Box className="bg-container">
    <Box className="shape shape-1" />
    <Box className="shape shape-2" />
    <Box className="shape shape-3" />
  </Box>
);
