// tamagui-ignore
import {
  INITIAL_PRODUCT_FORM_VALUES,
  PANTRY_CATEGORIES,
  PANTRY_CATEGORY_LABELS,
  productFormSchema,
  toProductFormValues,
  toProductPayload,
} from '@omni/shared/pantry';
import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { useState } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { Banner, Button, FormSheet, getErrorMessage, SegmentedControl, Select, TextField } from '@/shared/ui';

import { expiryToDisplay, maskExpiryInput, parseExpiryInput } from '../utils/expiryDate';
import { parseNumberInput } from '../utils/numberInput';
import { CategoryTile } from './CategoryTile';
import { ProductAuthorRows } from './ProductAuthorRows';
import { ProductAlertBadges } from './ProductAlertBadges';
import { ProductQuantityStepper } from './ProductQuantityStepper';

import type { CreatePantryProductPayload, PantryCategory, PantryProduct, PantryUnit } from '@omni/shared/pantry';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Elegí una categoría' },
  ...PANTRY_CATEGORIES.map(value => ({ value, label: PANTRY_CATEGORY_LABELS[value] })),
] as const;

const UNIT_OPTIONS = [
  { value: 'UNITS', label: 'Unidades' },
  { value: 'PACKAGES', label: 'Paquetes' },
] as const;

type FieldErrors = Partial<Record<'name' | 'category' | 'quantity' | 'minQuantity' | 'expiresAt', string>>;

type FormState = {
  name: string;
  category: PantryCategory | '';
  unit: PantryUnit;
  quantity: string;
  minQuantity: string;
  expiresAt: string;
};

type ProductFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: PantryProduct;
  showAuthor?: boolean;
  onSubmit: (payload: CreatePantryProductPayload) => Promise<void>;
  onDelete?: (product: PantryProduct) => void;
  onClosed?: () => void;
};

function initialState(product?: PantryProduct): FormState {
  const values = product ? toProductFormValues(product) : INITIAL_PRODUCT_FORM_VALUES;
  return {
    name: values.name,
    category: values.category ?? '',
    unit: values.unit,
    quantity: String(values.quantity),
    minQuantity: String(values.minQuantity),
    expiresAt: expiryToDisplay(values.expiresAt),
  };
}

type ProductFormProps = Pick<ProductFormSheetProps, 'product' | 'showAuthor' | 'onSubmit' | 'onDelete'> & {
  submitting: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  onDone: () => void;
};

/**
 * Formulario de alta y edición. Vive dentro de la hoja, así que se desmonta al cerrarla y vuelve a su estado inicial.
 * "Guardar" se habilita recién cuando hay cambios; en la edición la cantidad se ajusta con el stepper y las
 * validaciones (las del schema compartido con web) corren al enviar.
 */
function ProductForm({
  product,
  showAuthor,
  onSubmit,
  onDelete,
  submitting,
  onSubmittingChange,
  onDone,
}: ProductFormProps) {
  const [initial] = useState(() => initialState(product));
  const [state, setState] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const patch = (partial: Partial<FormState>) => setState(current => ({ ...current, ...partial }));
  const dirty = (Object.keys(initial) as (keyof FormState)[]).some(key => state[key] !== initial[key]);
  const parsedMin = parseNumberInput(state.minQuantity);
  const minQuantity = typeof parsedMin === 'number' && !Number.isNaN(parsedMin) ? parsedMin : null;
  const quantity = parseNumberInput(state.quantity);

  const handleSubmit = async () => {
    if (submitting) return;
    const expiresAt = parseExpiryInput(state.expiresAt);
    const values = {
      name: state.name,
      category: state.category === '' ? null : state.category,
      unit: state.unit,
      quantity,
      minQuantity: parseNumberInput(state.minQuantity),
      expiresAt: expiresAt ?? null,
    };
    const result = productFormSchema.safeParse(values);
    const next: FieldErrors = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        next[field] ??= issue.message;
      }
    }
    if (expiresAt === undefined) next.expiresAt = 'Ingresá una fecha válida (dd/mm/aaaa)';
    setErrors(next);
    if (!result.success || Object.keys(next).length > 0) return;

    onSubmittingChange(true);
    setSubmitError(null);
    try {
      await onSubmit(toProductPayload(result.data));
      onDone();
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo guardar el producto'));
      onSubmittingChange(false);
    }
  };

  return (
    <YStack gap={SPACING.md}>
      {submitError ? <Banner color="destructive">{submitError}</Banner> : null}

      {product ? (
        <YStack gap={SPACING.sm}>
          <XStack alignItems="center" gap={SPACING.sm}>
            <CategoryTile
              category={product.category}
              isLowStock={product.isLowStock}
              isExpiringSoon={product.isExpiringSoon}
            />
            <Paragraph color="$dimmed" fontSize={FONT_SIZE.md} flex={1}>
              {PANTRY_CATEGORY_LABELS[product.category]}
            </Paragraph>
          </XStack>
          <ProductAlertBadges product={product} />
          <ProductQuantityStepper
            value={Number(quantity) || 0}
            unit={state.unit}
            minQuantity={minQuantity}
            onChange={value => patch({ quantity: String(value) })}
          />
        </YStack>
      ) : null}

      <TextField
        label="Nombre"
        required
        placeholder="Ej: Leche entera"
        maxLength={120}
        value={state.name}
        onChangeText={name => patch({ name })}
        error={errors.name}
      />

      <YStack gap={SPACING['2xs']}>
        <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
          Categoría
          <Paragraph color="$destructive" fontSize={FONT_SIZE.md} fontWeight="600">
            {' *'}
          </Paragraph>
        </Paragraph>
        <Select<PantryCategory | ''>
          data={CATEGORY_OPTIONS}
          value={state.category}
          onChange={category => patch({ category })}
          accessibilityLabel="Categoría"
        />
        {errors.category ? (
          <Paragraph color="$destructive" fontSize={FONT_SIZE.sm}>
            {errors.category}
          </Paragraph>
        ) : null}
      </YStack>

      <YStack gap={SPACING['2xs']}>
        <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
          Unidad
        </Paragraph>
        <SegmentedControl
          data={UNIT_OPTIONS}
          value={state.unit}
          onChange={unit => patch({ unit })}
          accessibilityLabel="Unidad"
        />
      </YStack>

      {product ? null : (
        <TextField
          label="Cantidad"
          required
          keyboardType="decimal-pad"
          value={state.quantity}
          onChangeText={quantity => patch({ quantity })}
          error={errors.quantity}
        />
      )}
      <TextField
        label="Mínimo"
        placeholder="Opcional"
        description="Con el mínimo te avisamos cuando queda esa cantidad o menos."
        keyboardType="decimal-pad"
        value={state.minQuantity}
        onChangeText={minQuantity => patch({ minQuantity })}
        error={errors.minQuantity}
      />
      <TextField
        label="Vencimiento"
        placeholder="dd/mm/aaaa"
        keyboardType="number-pad"
        maxLength={10}
        value={state.expiresAt}
        onChangeText={text => patch({ expiresAt: maskExpiryInput(text) })}
        error={errors.expiresAt}
      />

      {product && showAuthor ? (
        <ProductAuthorRows createdById={product.createdById} updatedById={product.updatedById} />
      ) : null}

      <YStack gap={SPACING.sm}>
        <Button fullWidth size="lg" loading={submitting} disabled={!dirty} onPress={() => void handleSubmit()}>
          {product ? 'Guardar cambios' : 'Agregar producto'}
        </Button>
        {product && onDelete ? (
          <Button
            fullWidth
            size="lg"
            variant="outline"
            color="destructive"
            disabled={submitting}
            onPress={() => onDelete(product)}
          >
            Eliminar
          </Button>
        ) : null}
      </YStack>
    </YStack>
  );
}

/**
 * Hoja de alta y de detalle/edición de un producto de la alacena (= `ProductFormModal` de web). Sin `product` es el
 * alta; con producto, el detalle editable. `onSubmit` tira si falla: la hoja muestra el error y queda abierta.
 * `onDelete` pide la baja: quien la maneja cierra la hoja y confirma afuera, porque `confirm()` quedaría detrás del
 * Modal.
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
