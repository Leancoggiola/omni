import { Center, Paper, Stack, Title } from '@mantine/core';

import { LogoAvatar } from '@/shared/ui';

import type { FC, ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  children: ReactNode;
}

export const AuthCard: FC<AuthCardProps> = ({ title, children }) => {
  return (
    <Paper w="25rem" maw="100%" mx="auto" p="lg">
      <Stack gap="xl" justify="center">
        <Center>
          <LogoAvatar size="xl" bg="transparent" />
        </Center>
        <Title order={2} fw={700} ta="center">
          {title}
        </Title>
        {children}
      </Stack>
    </Paper>
  );
};
