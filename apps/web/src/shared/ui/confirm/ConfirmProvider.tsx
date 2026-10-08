import { FC, ReactNode, useCallback, useEffect, useState } from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';

import { registerConfirmHandler } from './confirm';

import type { ConfirmRequest } from './types';

export const ConfirmProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<ConfirmRequest[]>([]);
  const request = queue[0] ?? null;

  const close = useCallback((result: boolean) => {
    setQueue(current => {
      const head = current[0];
      if (!head) return current;
      head.resolve(result);
      return current.slice(1);
    });
  }, []);

  useEffect(() => {
    return registerConfirmHandler(newRequest => {
      setQueue(current => [...current, newRequest]);
    });
  }, []);

  return (
    <>
      {children}
      <Modal opened={request !== null} onClose={() => close(false)} title={request?.title} centered>
        <Text size="md" mb="lg">
          {request?.description}
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="outline" onClick={() => close(false)}>
            {request?.cancelLabel}
          </Button>
          <Button color={request?.destructive === false ? 'brand' : 'destructive'} onClick={() => close(true)}>
            {request?.confirmLabel}
          </Button>
        </Group>
      </Modal>
    </>
  );
};
