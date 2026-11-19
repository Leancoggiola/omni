import { FC, useEffect, useRef, useState } from 'react';
import { ActionIcon, Button, Group, Stack, Text, VisuallyHidden } from '@mantine/core';

import { formatSetsAndReps } from '../../utils/gymFormat';
import { moveItem } from '../../utils/gymOrder';
import { ExerciseTile } from '../ExerciseTile';
import { GymFormBanner } from '../GymFormBanner';

import type { GymExercise } from '@omni/shared/gym';

import { ArrowDownIcon, ArrowUpIcon } from '@phosphor-icons/react';

export type SaveOrderResult = 'saved' | 'conflict' | 'closed' | 'failed';

interface DayReorderListProps {
  exercises: GymExercise[];
  dayLabel: string;
  onSave: (exerciseIds: string[]) => Promise<SaveOrderResult>;
  onCancel: () => void;
  onReload: () => Promise<void>;
}

interface FocusTarget {
  id: string;
  direction: 'up' | 'down';
}

/**
 * Modo orden de un día: flechas subir y bajar por fila (sin arrastrar), Cancelar y Guardar orden. Se guarda el día
 * completo. Tras mover una fila el foco queda en su botón y se anuncia su posición ("Sentadilla, posición 2 de 3").
 * Si la API responde que la lista ya no coincide, muestra el aviso y deshabilita Guardar hasta recargar el día; la
 * recarga re-monta este componente (con `key`) para arrancar de la lista nueva.
 */
export const DayReorderList: FC<DayReorderListProps> = ({ exercises, dayLabel, onSave, onCancel, onReload }) => {
  const [ids, setIds] = useState(() => exercises.map(exercise => exercise.id));
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const byId = new Map(exercises.map(exercise => [exercise.id, exercise]));
  const initial = exercises.map(exercise => exercise.id);
  const dirty = ids.some((id, index) => id !== initial[index]);

  useEffect(() => {
    if (!focusTarget) return;
    buttons.current.get(`${focusTarget.id}:${focusTarget.direction}`)?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  const move = (id: string, direction: 'up' | 'down') => {
    const index = ids.indexOf(id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= ids.length || saving || conflict) return;
    setIds(moveItem(ids, index, target));
    setFocusTarget({ id, direction });
    setAnnouncement(`${byId.get(id)?.name}, posición ${target + 1} de ${ids.length}`);
  };

  const handleSave = async () => {
    if (saving || conflict || !dirty) return;
    setSaving(true);
    try {
      const result = await onSave(ids);
      if (result === 'conflict') setConflict(true);
    } finally {
      setSaving(false);
    }
  };

  const handleReload = async () => {
    setReloading(true);
    try {
      await onReload();
    } finally {
      setReloading(false);
    }
  };

  const setButton = (key: string) => (node: HTMLButtonElement | null) => {
    if (node) buttons.current.set(key, node);
    else buttons.current.delete(key);
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Text size="sm" c="dimmed">
          Ordená con las flechas
        </Text>
        <Group gap="sm">
          <Button variant="outline" size="xs" disabled={saving} onClick={onCancel}>
            Cancelar
          </Button>
          <Button size="xs" loading={saving} disabled={!dirty || conflict} onClick={() => void handleSave()}>
            Guardar orden
          </Button>
        </Group>
      </Group>

      {conflict && (
        <Stack gap="xs" align="flex-start">
          <GymFormBanner
            message="La lista no coincide con los ejercicios del día"
            help="Recargá el día para ver la lista actual y volvé a ordenar."
          />
          <Button variant="light" size="xs" loading={reloading} onClick={() => void handleReload()}>
            Recargar el día
          </Button>
        </Stack>
      )}

      <Stack gap="none" role="list" aria-label={`Orden de los ejercicios del ${dayLabel.toLowerCase()}`}>
        {ids.map((id, index) => {
          const exercise = byId.get(id);
          if (!exercise) return null;
          return (
            <Group key={id} gap="md" wrap="nowrap" py="xs" role="listitem">
              <ExerciseTile size="2.25rem" />
              <Stack gap="none" flex={1} miw={0}>
                <Text fw={700} lineClamp={1}>
                  {exercise.name}
                </Text>
                <Text size="sm" c="dimmed">
                  {formatSetsAndReps(exercise.sets, exercise.reps)}
                </Text>
              </Stack>
              <ActionIcon
                ref={setButton(`${id}:up`)}
                variant="subtle"
                color="gray"
                data-disabled={index === 0 || conflict || undefined}
                aria-disabled={index === 0 || conflict}
                aria-label={`Subir ${exercise.name}`}
                onClick={() => move(id, 'up')}
              >
                <ArrowUpIcon size="1.125rem" />
              </ActionIcon>
              <ActionIcon
                ref={setButton(`${id}:down`)}
                variant="subtle"
                color="gray"
                data-disabled={index === ids.length - 1 || conflict || undefined}
                aria-disabled={index === ids.length - 1 || conflict}
                aria-label={`Bajar ${exercise.name}`}
                onClick={() => move(id, 'down')}
              >
                <ArrowDownIcon size="1.125rem" />
              </ActionIcon>
            </Group>
          );
        })}
      </Stack>
      <VisuallyHidden role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
    </Stack>
  );
};
