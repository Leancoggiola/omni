import { Center, Paper, Stack } from '@mantine/core';

import { AccentTitle, LogoAvatar } from '@/shared/ui';

import type { FC, ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  accent?: string;
  children: ReactNode;
}

export const AuthCard: FC<AuthCardProps> = ({ title, accent, children }) => {
  return (
    <Paper component="section" aria-label="Ingreso" w="25rem" maw="100%" mx="auto" p="lg">
      <Stack gap="xl" justify="center">
        <Center>
          <LogoAvatar size="xl" bg="transparent" />
        </Center>
        <AccentTitle order={2} title={title} accent={accent} display="lg" fz="1.75rem" lh="2rem" ta="center" />
        {children}
      </Stack>
    </Paper>
  );
};
