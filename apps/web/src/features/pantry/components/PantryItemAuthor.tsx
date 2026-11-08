import { FC } from 'react';

import { useItemAuthor } from '@/core/household';
import { AuthorTag } from '@/shared/ui';

interface PantryItemAuthorProps {
  createdById: string | null;
}

/** "Agregado por": discreto, solo cuando el hogar es compartido (quien lo usa decide si mostrarlo). */
export const PantryItemAuthor: FC<PantryItemAuthorProps> = ({ createdById }) => {
  const author = useItemAuthor(createdById);

  return author ? <AuthorTag author={author} /> : null;
};
