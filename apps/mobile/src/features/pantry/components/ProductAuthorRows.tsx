import { ITEM_ADDED_BY_LABEL, ITEM_EDITED_BY_LABEL } from '@omni/shared/household';
import { FONT_SIZE } from '@omni/shared/theme';
import { Paragraph, XStack } from 'tamagui';

import { useItemAuthor, useItemEditor } from '@/core/household';
import { AuthorTag } from '@/shared/ui';

import type { ItemAuthor } from '@omni/shared/household';

type ProductAuthorRowProps = {
  label: string;
  author: ItemAuthor;
};

/** Una fila etiqueta-valor con el autor, como el resto de los datos del detalle. */
function ProductAuthorRow({ label, author }: ProductAuthorRowProps) {
  return (
    <XStack alignItems="center" justifyContent="space-between">
      <Paragraph color="$dimmed" fontSize={FONT_SIZE.md}>
        {label}
      </Paragraph>
      <AuthorTag author={author} actionLabel={label} />
    </XStack>
  );
}

type ProductAuthorRowsProps = {
  createdById: string | null;
  updatedById: string | null;
};

/** Filas "Agregado por" y, si editó otra persona, "Editado por" del detalle de un producto en un hogar compartido. */
export function ProductAuthorRows({ createdById, updatedById }: ProductAuthorRowsProps) {
  const author = useItemAuthor(createdById);
  const editor = useItemEditor(createdById, updatedById);

  return (
    <>
      {author ? <ProductAuthorRow label={ITEM_ADDED_BY_LABEL} author={author} /> : null}
      {editor ? <ProductAuthorRow label={ITEM_EDITED_BY_LABEL} author={editor} /> : null}
    </>
  );
}
