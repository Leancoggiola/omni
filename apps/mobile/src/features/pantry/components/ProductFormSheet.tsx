// tamagui-ignore
import { useState } from 'react';

import { FormSheet } from '@/shared/ui';

import { ProductForm, type ProductFormProps } from './ProductForm';

type ProductFormSheetProps = Pick<
  ProductFormProps,
  'product' | 'showAuthor' | 'onSubmit' | 'onDelete' | 'onUnlinkBarcode'
> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: () => void;
};

/**
 * Hoja de alta y de detalle/edición de un producto de la alacena (= `ProductFormModal` de web). Sin `product` es el
 * alta; con producto, el detalle editable. `onSubmit` tira si falla: la hoja muestra el error y queda abierta.
 * `onDelete` pide la baja: quien la maneja cierra la hoja y confirma afuera, porque `confirm()` quedaría detrás del
 * Modal. `onUnlinkBarcode` suma al detalle el código vinculado con "Quitar código".
 */
export function ProductFormSheet({ open, onOpenChange, product, onClosed, ...rest }: ProductFormSheetProps) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={product ? product.name : 'Agregar producto'}
      busy={submitting}
      onClosed={onClosed}
    >
      <ProductForm
        {...rest}
        product={product}
        submitting={submitting}
        onSubmittingChange={setSubmitting}
        onDone={() => {
          setSubmitting(false);
          onOpenChange(false);
        }}
      />
    </FormSheet>
  );
}
