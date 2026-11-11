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

import { Banner, Button, getErrorMessage, SegmentedControl, Select, TextField } from '@/shared/ui';

import { expiryToDisplay, maskExpiryInput, parseExpiryInput } from '../utils/expiryDate';
import { parseNumberInput } from '../utils/numberInput';
import { CategoryTile } from './CategoryTile';
import { ProductAlertBadges } from './ProductAlertBadges';
import { ProductAuthorRows } from './ProductAuthorRows';
import { ProductQuantityStepper } from './ProductQuantityStepper';

import type {
  CreatePantryProductPayload,
  PantryCategory,
  PantryProduct,
  PantryUnit,
  ProductFormValues,
} from '@omni/shared/pantry';

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

export type ProductFormProps = {
  product?: PantryProduct;
  prefill?: Partial<ProductFormValues>;
  requirePositiveQuantity?: boolean;
  showAuthor?: boolean;
  onSubmit: (payload: CreatePantryProductPayload) => Promise<void>;
  onDelete?: (product: PantryProduct) => void;
  onUnlinkBarcode?: (product: PantryProduct) => Promise<void>;
  submitting: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  onDone: () => void;
};

/** Estado inicial del form: el producto guardado, o el alta vacía con lo que llegue precargado. */
function initialState(product?: PantryProduct, prefill?: Partial<ProductFormValues>): FormState {
  const values = product ? toProductFormValues(product) : { ...INITIAL_PRODUCT_FORM_VALUES, ...prefill };
  return {
    name: values.name,
    category: values.category ?? '',
    unit: values.unit,
    quantity: String(values.quantity),
    minQuantity: String(values.minQuantity),
    expiresAt: expiryToDisplay(values.expiresAt),
  };
}

/**
 * Formulario de alta y edición de un producto. Vive dentro de una hoja, así que se desmonta al cerrarla y vuelve a su
 * estado inicial. "Guardar" se habilita recién cuando hay cambios, salvo con un `prefill` que trae nombre (el alta que
 * llega de Open Food Facts ya tiene datos para guardar); en la edición la cantidad se ajusta con el stepper y las validaciones (las del schema
 * compartido con web) corren al enviar. `requirePositiveQuantity` pide más de cero, que es lo que exige el escaneo.
 * Con `onUnlinkBarcode` el detalle muestra el código vinculado y "Quitar código", que guarda al instante sin tocar el
 * resto del form.
 */
export function ProductForm({
  product,
  prefill,
  requirePositiveQuantity = false,
  showAuthor,
  onSubmit,
  onDelete,
  onUnlinkBarcode,
  submitting,
  onSubmittingChange,
  onDone,
}: ProductFormProps) {
  const [initial] = useState(() => initialState(product, prefill));
  const [state, setState] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [barcode, setBarcode] = useState(product?.barcode ?? null);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkNotice, setUnlinkNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const patch = (partial: Partial<FormState>) => setState(current => ({ ...current, ...partial }));
  const dirty = (Object.keys(initial) as (keyof FormState)[]).some(key => state[key] !== initial[key]);
  const canSubmit = dirty || Boolean(prefill?.name);
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
    if (requirePositiveQuantity && !next.quantity && quantity === 0) {
      next.quantity = 'Ingresá una cantidad mayor a cero';
    }
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

  const handleUnlink = async () => {
    if (!product || !onUnlinkBarcode || submitting) return;
    setUnlinking(true);
    onSubmittingChange(true);
    setUnlinkNotice(null);
    try {
      await onUnlinkBarcode(product);
      setBarcode(null);
      setUnlinkNotice({ ok: true, message: 'Quitamos el código de barras' });
    } catch (err) {
      setUnlinkNotice({ ok: false, message: getErrorMessage(err, 'No se pudo quitar el código') });
    } finally {
      setUnlinking(false);
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

      {product && onUnlinkBarcode && (barcode || unlinkNotice) ? (
        <YStack gap={SPACING.sm}>
          {unlinkNotice ? (
            <Banner color={unlinkNotice.ok ? 'success' : 'destructive'}>{unlinkNotice.message}</Banner>
          ) : null}
          {barcode ? (
            <>
              <YStack gap={SPACING['2xs']}>
                <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
                  Código de barras
                </Paragraph>
                <Paragraph color="$dimmed" fontSize={FONT_SIZE.md}>
                  {barcode}
                </Paragraph>
              </YStack>
              <Button
                fullWidth
                variant="outline"
                color="destructive"
                loading={unlinking}
                disabled={submitting && !unlinking}
                onPress={() => void handleUnlink()}
              >
                Quitar código
              </Button>
            </>
          ) : null}
        </YStack>
      ) : null}

      {product && showAuthor ? (
        <ProductAuthorRows createdById={product.createdById} updatedById={product.updatedById} />
      ) : null}

      <YStack gap={SPACING.sm}>
        <Button
          fullWidth
          size="lg"
          loading={submitting && !unlinking}
          disabled={!canSubmit || unlinking}
          onPress={() => void handleSubmit()}
        >
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
