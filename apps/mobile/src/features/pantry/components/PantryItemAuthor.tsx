import { ITEM_EDITED_BY_LABEL } from '@omni/shared/household';
import { SPACING } from '@omni/shared/theme';
import { XStack } from 'tamagui';

import { useItemAuthor, useItemEditor } from '@/core/household';
import { AuthorTag } from '@/shared/ui';

type PantryItemAuthorProps = {
  createdById: string | null;
  updatedById: string | null;
};

/**
 * "Agregado por" y, si editó otra persona, "Editado por": discreto, solo cuando el hogar es compartido (quien lo usa
 * decide si mostrarlo).
 */
export function PantryItemAuthor({ createdById, updatedById }: PantryItemAuthorProps) {
  const author = useItemAuthor(createdById);
  const editor = useItemEditor(createdById, updatedById);

  if (!author && !editor) return null;

  return (
    <XStack gap={SPACING.xs} alignItems="center" flexWrap="wrap">
      {author ? <AuthorTag author={author} /> : null}
      {editor ? <AuthorTag author={editor} actionLabel={ITEM_EDITED_BY_LABEL} showActionLabel /> : null}
    </XStack>
  );
}
