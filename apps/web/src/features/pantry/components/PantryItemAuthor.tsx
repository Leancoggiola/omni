import { FC } from 'react';
import { Group } from '@mantine/core';

import { useItemAuthor, useItemEditor } from '@/core/household';
import { AuthorTag } from '@/shared/ui';

import { ITEM_EDITED_BY_LABEL } from '@omni/shared/household';

interface PantryItemAuthorProps {
  createdById: string | null;
  updatedById: string | null;
}

/**
 * "Agregado por" y, si editó otra persona, "Editado por": discreto, solo cuando el hogar es compartido (quien lo usa
 * decide si mostrarlo).
 */
export const PantryItemAuthor: FC<PantryItemAuthorProps> = ({ createdById, updatedById }) => {
  const author = useItemAuthor(createdById);
  const editor = useItemEditor(createdById, updatedById);

  if (!author && !editor) return null;

  return (
    <Group gap="xs" wrap="wrap">
      {author && <AuthorTag author={author} />}
      {editor && <AuthorTag author={editor} actionLabel={ITEM_EDITED_BY_LABEL} showActionLabel />}
    </Group>
  );
};
