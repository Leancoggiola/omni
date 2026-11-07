import { useItemAuthor } from '@/core/household';
import { AuthorTag } from '@/shared/ui';

type PantryItemAuthorProps = {
  createdById: string | null;
};

/** "Agregado por": discreto, solo cuando el hogar es compartido (quien lo usa decide si mostrarlo). */
export function PantryItemAuthor({ createdById }: PantryItemAuthorProps) {
  const author = useItemAuthor(createdById);

  return author ? <AuthorTag author={author} /> : null;
}
