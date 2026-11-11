import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { product } from '../fixtures';
import { ProductFormSheet } from './ProductFormSheet';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/core/household', () => ({
  useItemAuthor: () => ({ kind: 'member', name: 'Ana' }),
  useItemEditor: (createdById: string | null, updatedById: string | null) =>
    updatedById !== createdById ? { kind: 'self', name: 'Yo' } : undefined,
}));

function renderSheet(props: Partial<React.ComponentProps<typeof ProductFormSheet>> = {}) {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const onOpenChange = jest.fn();
  render(<ProductFormSheet open onOpenChange={onOpenChange} onSubmit={onSubmit} {...props} />);
  return { onSubmit, onOpenChange };
}

describe('ProductFormSheet · alta', () => {
  it('Agregar producto está deshabilitado hasta que el form cambia', () => {
    renderSheet();

    expect(screen.getByRole('button', { name: 'Agregar producto' }).props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByLabelText(/Nombre/), 'Té');
    expect(screen.getByRole('button', { name: 'Agregar producto' }).props.accessibilityState.disabled).toBe(false);
  });

  it('valida al enviar: nombre, categoría y cantidad', async () => {
    const { onSubmit } = renderSheet();

    fireEvent.changeText(screen.getByLabelText(/Nombre/), ' ');
    fireEvent.changeText(screen.getByLabelText(/Cantidad/), '2');
    fireEvent.changeText(screen.getByLabelText(/Cantidad/), '');
    fireEvent.changeText(screen.getByLabelText(/Nombre/), 'Té');
    fireEvent.press(screen.getByRole('button', { name: 'Agregar producto' }));

    expect(await screen.findAllByText('Elegí una categoría')).toHaveLength(2);
    expect(screen.getByText('Ingresá una cantidad')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('muestra el error del envío en la hoja y la deja abierta', async () => {
    const { onSubmit, onOpenChange } = renderSheet({
      product: product({ expiresAt: '2026-11-20T00:00:00.000Z' }),
    });
    onSubmit.mockRejectedValue(new Error('x'));

    fireEvent.press(screen.getByRole('button', { name: 'Sumar uno' }));
    fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('No se pudo guardar el producto')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe('ProductFormSheet · edición', () => {
  it('el stepper ajusta la cantidad, habilita Guardar y envía el payload completo', async () => {
    const { onSubmit, onOpenChange } = renderSheet({ product: product(), showAuthor: true });

    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar cambios' }).props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Sumar uno' }));
    fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Leche entera',
        category: 'DAIRY',
        unit: 'PACKAGES',
        quantity: 2,
        minQuantity: 2,
        expiresAt: null,
      })
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('sin hogar compartido no muestra "Agregado por" y Eliminar pide la baja', () => {
    const onDelete = jest.fn();
    renderSheet({ product: product(), onDelete });

    expect(screen.queryByText('Agregado por')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('con hogar compartido suma "Editado por" si editó otra persona', () => {
    renderSheet({ product: product({ updatedById: 'u2' }), showAuthor: true });

    expect(screen.getByText('Agregado por')).toBeTruthy();
    expect(screen.getByText('Editado por')).toBeTruthy();
    expect(screen.getByLabelText('Editado por Vos')).toBeTruthy();
  });

  it('el stepper no baja de cero', () => {
    renderSheet({ product: product({ quantity: 0 }) });

    expect(screen.getByRole('button', { name: 'Restar uno' }).props.accessibilityState.disabled).toBe(true);
  });
});

describe('ProductFormSheet · código de barras', () => {
  const BARCODE = '7790895000997';

  it('sin código vinculado no muestra la fila del código', () => {
    renderSheet({ product: product(), onUnlinkBarcode: jest.fn() });

    expect(screen.queryByText('Código de barras')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Quitar código' })).toBeNull();
  });

  it('Quitar código lo desvincula, avisa en la hoja y no envía el resto del form', async () => {
    const onUnlinkBarcode = jest.fn().mockResolvedValue(undefined);
    const { onSubmit, onOpenChange } = renderSheet({ product: product({ barcode: BARCODE }), onUnlinkBarcode });

    expect(screen.getByText(BARCODE)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Quitar código' }));

    expect(await screen.findByText('Quitamos el código de barras')).toBeTruthy();
    expect(onUnlinkBarcode).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    expect(screen.queryByText(BARCODE)).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('si quitar el código falla muestra el error y lo conserva', async () => {
    const onUnlinkBarcode = jest.fn().mockRejectedValue(new Error('red'));
    renderSheet({ product: product({ barcode: BARCODE }), onUnlinkBarcode });

    fireEvent.press(screen.getByRole('button', { name: 'Quitar código' }));

    expect(await screen.findByText('No se pudo quitar el código')).toBeTruthy();
    expect(screen.getByText(BARCODE)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quitar código' })).toBeTruthy();
  });

  it('mientras quita el código no se puede guardar', async () => {
    let release: () => void = () => {};
    const onUnlinkBarcode = jest.fn(() => new Promise<void>(resolve => (release = resolve)));
    renderSheet({ product: product({ barcode: BARCODE }), onUnlinkBarcode });

    fireEvent.press(screen.getByRole('button', { name: 'Sumar uno' }));
    fireEvent.press(screen.getByRole('button', { name: 'Quitar código' }));

    expect(screen.getByRole('button', { name: 'Guardar cambios' }).props.accessibilityState.disabled).toBe(true);
    release();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Guardar cambios' }).props.accessibilityState.disabled).toBe(false)
    );
  });
});
