import { FC, ReactNode, useEffect, useState } from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';

import { registerConfirmHandler } from './confirm';

import type { ConfirmRequest } from './types';

/**
 * Modal de confirmación global. Resuelve la promesa del pedido fuera del updater de `setQueue` y mantiene el
 * último pedido mostrado mientras dura la animación de cierre, para que el contenido no se vacíe antes de tiempo.
 */
export const ConfirmProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<ConfirmRequest[]>([]);
  const [content, setContent] = useState<ConfirmRequest | null>(null);
  const request = queue[0] ?? null;

  if (request && request !== content) setContent(request);

  const close = (result: boolean) => {
    if (!request) return;
    request.resolve(result);
    setQueue(current => (current[0] === request ? current.slice(1) : current));
  };

  useEffect(() => {
    return registerConfirmHandler(newRequest => {
      setQueue(current => [...current, newRequest]);
    });
  }, []);

  return (
    <>
      {children}
      <Modal opened={request !== null} onClose={() => close(false)} title={content?.title} centered>
        <Text size="md" mb="lg">
          {content?.description}
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="outline" onClick={() => close(false)}>
            {content?.cancelLabel}
          </Button>
          <Button color={content?.destructive === false ? 'brand' : 'destructive'} onClick={() => close(true)}>
            {content?.confirmLabel}
          </Button>
        </Group>
      </Modal>
    </>
  );
};
