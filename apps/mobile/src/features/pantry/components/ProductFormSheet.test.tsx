import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { product } from '../fixtures';
import { ProductFormSheet } from './ProductFormSheet';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/core/household', () => ({ useItemAuthor: () => ({ kind: 'member', name: 'Ana' }) }));

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

  it('el stepper no baja de cero', () => {
    renderSheet({ product: product({ quantity: 0 }) });

    expect(screen.getByRole('button', { name: 'Restar uno' }).props.accessibilityState.disabled).toBe(true);
  });
});
