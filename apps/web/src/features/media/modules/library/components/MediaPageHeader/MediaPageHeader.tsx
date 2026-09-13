import { FC } from 'react';
import { Button, Center, Group, SegmentedControl } from '@mantine/core';

import { PageHeader } from '@/shared/ui';

import { FilmSlateIcon, GridFourIcon, ListIcon, PlusIcon } from '@phosphor-icons/react';

interface MediaPageHeaderProps {
  onAdd: () => void;
  displayMode: string;
  onDisplayChange: (value: string) => void;
}

export const MediaPageHeader: FC<MediaPageHeaderProps> = ({ onAdd, displayMode, onDisplayChange }) => {
  return (
    <PageHeader
      icon={<FilmSlateIcon size="1.5rem" />}
      title="Películas y Series"
      subtitle="Tu lista de seguimiento"
      actions={
        <Group gap="xs">
          <SegmentedControl
            value={displayMode}
            onChange={onDisplayChange}
            radius="md"
            size="sm"
            color="brand.6"
            bg="var(--mantine-color-default)"
            styles={{ label: { padding: '4px' } }}
            data={[
              {
                value: 'grid',
                label: (
                  <Center>
                    <GridFourIcon size={20} />
                  </Center>
                ),
              },
              {
                value: 'list',
                label: (
                  <Center>
                    <ListIcon size={20} />
                  </Center>
                ),
              },
            ]}
          />
          <Button variant="gradient" size="sm" leftSection={<PlusIcon size="1rem" weight="bold" />} onClick={onAdd}>
            Agregar
          </Button>
        </Group>
      }
    />
  );
};
