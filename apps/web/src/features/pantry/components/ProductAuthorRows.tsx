import { FC } from 'react';
import { Group, Text } from '@mantine/core';

import { useItemAuthor, useItemEditor } from '@/core/household';
import { AuthorTag } from '@/shared/ui';

import type { ItemAuthor } from '@omni/shared/household';

import { ITEM_ADDED_BY_LABEL, ITEM_EDITED_BY_LABEL } from '@omni/shared/household';

interface ProductAuthorRowProps {
  label: string;
  author: ItemAuthor;
}

/** Una fila etiqueta-valor con el autor, como el resto de los datos del detalle. */
const ProductAuthorRow: FC<ProductAuthorRowProps> = ({ label, author }) => (
  <Group justify="space-between" wrap="nowrap">
    <Text size="sm" c="dimmed">
      {label}
    </Text>
    <AuthorTag author={author} actionLabel={label} />
  </Group>
);

interface ProductAuthorRowsProps {
  createdById: string | null;
  updatedById: string | null;
}

/** Filas "Agregado por" y, si editó otra persona, "Editado por" del detalle de un producto en un hogar compartido. */
export const ProductAuthorRows: FC<ProductAuthorRowsProps> = ({ createdById, updatedById }) => {
  const author = useItemAuthor(createdById);
  const editor = useItemEditor(createdById, updatedById);

  return (
    <>
      {author && <ProductAuthorRow label={ITEM_ADDED_BY_LABEL} author={author} />}
      {editor && <ProductAuthorRow label={ITEM_EDITED_BY_LABEL} author={editor} />}
    </>
  );
};
