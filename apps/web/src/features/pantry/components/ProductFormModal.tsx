import { FC, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  Input,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { schemaResolver, useForm } from '@mantine/form';

import { DISPLAY_DATE_FORMAT } from '@/shared/dates';
import { getErrorMessage } from '@/shared/ui';

import {
  INITIAL_PRODUCT_FORM_VALUES,
  productFormSchema,
  toProductFormValues,
  toProductPayload,
} from '../utils/productForm';
import { CategoryTile } from './CategoryTile';
import { PantryItemAuthor } from './PantryItemAuthor';
import { ProductAlertBadges } from './ProductAlertBadges';
import { ProductQuantityStepper } from './ProductQuantityStepper';

import type { ProductFormValues } from '../utils/productForm';
import type { CreatePantryProductPayload, PantryProduct } from '@omni/shared/pantry';

import { PANTRY_CATEGORIES, PANTRY_CATEGORY_LABELS } from '@omni/shared/pantry';

const CATEGORY_OPTIONS = PANTRY_CATEGORIES.map(value => ({ value, label: PANTRY_CATEGORY_LABELS[value] }));

const UNIT_OPTIONS = [
  { value: 'UNITS', label: 'Unidades' },
  { value: 'PACKAGES', label: 'Paquetes' },
];

interface ProductFormModalProps {
  opened: boolean;
  onClose: () => void;
  /** Sin producto es el alta; con producto, el detalle editable. */
  product?: PantryProduct;
  showAuthor?: boolean;
  onSubmit: (payload: CreatePantryProductPayload) => Promise<void>;
  onDelete?: (product: PantryProduct) => Promise<void>;
}

interface ProductFormProps extends Omit<ProductFormModalProps, 'opened' | 'onClose'> {
  loading: boolean;
  onCancel: () => void;
}

/**
 * Formulario de alta y edición. Vive dentro del modal, así que se desmonta al cerrarlo y vuelve a su estado inicial.
 * "Guardar" se habilita recién cuando hay cambios; en la edición la cantidad se ajusta con el stepper.
 */
const ProductForm: FC<ProductFormProps> = ({ product, showAuthor, loading, onSubmit, onDelete, onCancel }) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<ProductFormValues>({
    mode: 'controlled',
    initialValues: product ? toProductFormValues(product) : INITIAL_PRODUCT_FORM_VALUES,
    validate: schemaResolver(productFormSchema, { sync: true }),
  });

  const handleSubmit = async (values: ProductFormValues) => {
    if (loading) return;
    setSubmitError(null);
    try {
      await onSubmit(toProductPayload(values));
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo guardar el producto'));
    }
  };

  const minQuantity = form.values.minQuantity === '' ? null : Number(form.values.minQuantity);

  return (
    <form noValidate onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        {submitError && <Alert color="destructive">{submitError}</Alert>}

        {product && (
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <CategoryTile
                category={product.category}
                isLowStock={product.isLowStock}
                isExpiringSoon={product.isExpiringSoon}
              />
              <Text c="dimmed" size="sm">
                {PANTRY_CATEGORY_LABELS[product.category]}
              </Text>
            </Group>
            <ProductAlertBadges product={product} />
          </Group>
        )}

        {product && (
          <ProductQuantityStepper
            value={Number(form.values.quantity) || 0}
            unit={form.values.unit}
            minQuantity={minQuantity}
            onChange={value => form.setFieldValue('quantity', value)}
          />
        )}

        <TextInput
          label="Nombre"
          placeholder="Ej: Leche entera"
          maxLength={120}
          withAsterisk
          data-autofocus
          {...form.getInputProps('name')}
        />

        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <Select
            label="Categoría"
            data={CATEGORY_OPTIONS}
            placeholder="Elegí una categoría"
            withAsterisk
            {...form.getInputProps('category')}
          />
          <Input.Wrapper label="Unidad" withAsterisk>
            <SegmentedControl
              fullWidth
              aria-label="Unidad"
              data={UNIT_OPTIONS}
              value={form.values.unit}
              onChange={value => form.setFieldValue('unit', value as ProductFormValues['unit'])}
            />
          </Input.Wrapper>
          {!product && (
            <NumberInput
              label="Cantidad"
              min={0}
              allowNegative={false}
              withAsterisk
              {...form.getInputProps('quantity')}
            />
          )}
          <NumberInput
            label="Mínimo"
            placeholder="Opcional"
            min={0}
            allowNegative={false}
            {...form.getInputProps('minQuantity')}
          />
          <DatePickerInput
            label="Vencimiento"
            placeholder="dd/mm/aaaa"
            valueFormat={DISPLAY_DATE_FORMAT}
            clearable
            {...form.getInputProps('expiresAt')}
          />
        </SimpleGrid>

        {product && showAuthor && (
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" c="dimmed">
              Agregado por
            </Text>
            <PantryItemAuthor createdById={product.createdById} />
          </Group>
        )}

        <Group justify={product && onDelete ? 'space-between' : 'flex-end'} gap="sm" mt="sm">
          {product && onDelete && (
            <Button
              variant="outline"
              color="destructive"
              type="button"
              disabled={loading}
              onClick={() => void onDelete(product)}
            >
              Eliminar
            </Button>
          )}
          <Group gap="sm">
            <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} disabled={!form.isDirty()}>
              {product ? 'Guardar cambios' : 'Agregar producto'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </form>
  );
};

/** Modal centrado de alta y de detalle/edición de un producto de la alacena. */
export const ProductFormModal: FC<ProductFormModalProps> = ({ opened, onClose, product, onSubmit, ...rest }) => {
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleSubmit = async (payload: CreatePantryProductPayload) => {
    setLoading(true);
    try {
      await onSubmit(payload);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={product ? product.name : 'Agregar producto'}
      centered
      size="lg"
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <ProductForm {...rest} product={product} loading={loading} onSubmit={handleSubmit} onCancel={handleClose} />
    </Modal>
  );
};
