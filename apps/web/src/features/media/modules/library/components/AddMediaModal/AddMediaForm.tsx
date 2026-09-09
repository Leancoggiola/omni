import { FC, useCallback, useState } from 'react';
import { Alert, Box, Button, Group, Image, Select, SimpleGrid, Stack, Text } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';

import { getErrorMessage } from '@/shared/ui';

import { INITIAL_ADD_MEDIA_FORM_VALUES } from '../../utils/addMediaForm';
import { TmdbSearchField } from './TmdbSearchField';

import type { MediaStatus, MediaType } from '../../../_shared/types';
import type { AddMediaFormValues } from '@omni/shared/media';

import {
  addMediaFormSchema,
  MEDIA_STATUS_LABELS,
  MEDIA_STATUSES,
  MEDIA_TYPE_LABELS,
  TMDB_POSTER_W500,
} from '@omni/shared/media';

interface AddMediaFormProps {
  loading: boolean;
  existingTmdbIds: Set<string>;
  /** Throws on failure so the form can surface the message. */
  onSubmit: (tmdbId: number, mediaType: MediaType, status: MediaStatus) => Promise<void>;
  onCancel: () => void;
}

/** Rendered inside the modal, so Mantine unmounts it on close and the form state resets. */
export const AddMediaForm: FC<AddMediaFormProps> = ({ loading, existingTmdbIds, onSubmit, onCancel }) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedPosterPath, setSelectedPosterPath] = useState<string | null>(null);

  const form = useForm<AddMediaFormValues>({
    mode: 'controlled',
    initialValues: INITIAL_ADD_MEDIA_FORM_VALUES,
    validate: schemaResolver(addMediaFormSchema, { sync: true }),
  });

  const posterPreviewUrl = selectedPosterPath ? `${TMDB_POSTER_W500}${selectedPosterPath}` : null;

  const handleSelect = useCallback(
    (tmdbId: number, mediaType: MediaType, title: string, posterPath: string | null) => {
      form.setValues({ titleQuery: title, tmdbId, mediaType });
      setSelectedPosterPath(posterPath);
      form.clearFieldError('tmdbId');
    },
    [form]
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      form.setValues({
        titleQuery: value,
        tmdbId: null,
        mediaType: INITIAL_ADD_MEDIA_FORM_VALUES.mediaType,
      });
      setSelectedPosterPath(null);
    },
    [form]
  );

  const handleSubmit = async (values: AddMediaFormValues) => {
    if (values.tmdbId == null || loading) return;

    setSubmitError(null);
    try {
      await onSubmit(values.tmdbId, values.mediaType, values.status);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo guardar'));
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        {submitError && (
          <Alert color="destructive" variant="light">
            {submitError}
          </Alert>
        )}

        <TmdbSearchField
          value={form.values.titleQuery}
          error={form.errors.tmdbId as string | undefined}
          existingTmdbIds={existingTmdbIds}
          onQueryChange={handleQueryChange}
          onSelect={handleSelect}
        />

        <SimpleGrid cols={2} spacing="md">
          <Select
            label="Tipo"
            data={Object.entries(MEDIA_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            disabled
            {...form.getInputProps('mediaType')}
          />
          <Select
            label="Estado"
            data={MEDIA_STATUSES.map(value => ({ value, label: MEDIA_STATUS_LABELS[value] }))}
            {...form.getInputProps('status')}
          />
        </SimpleGrid>

        {posterPreviewUrl && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Poster (TMDB)
            </Text>
            <Box maw="7.5rem">
              <Image src={posterPreviewUrl} alt={form.values.titleQuery} radius="md" />
            </Box>
          </Stack>
        )}

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
