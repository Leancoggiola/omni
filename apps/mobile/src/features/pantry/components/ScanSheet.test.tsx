import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Linking } from 'react-native';

import { ApiError } from '@/shared/api';
import { notifySuccess } from '@/shared/ui';
import { actionSheet } from '@/shared/ui/actionSheet/actionSheet';

import { formatPantryQuantity } from '@omni/shared/pantry';

import { product } from '../fixtures';
import { ScanSheet } from './ScanSheet';

import type { PantryBarcodeSuggestion, PantryScanResult } from '@omni/shared/pantry';

type CameraProps = {
  onBarcodeScanned?: (result: { type: string; data: string }) => void;
  onCameraReady?: () => void;
  onMountError?: () => void;
  enableTorch?: boolean;
  barcodeScannerSettings?: { barcodeTypes: string[] };
};

const mockCamera: { props: CameraProps | null } = { props: null };
const mockPermission: { current: { granted: boolean; canAskAgain: boolean } | null } = {
  current: { granted: true, canAskAgain: true },
};
const mockRequestPermission = jest.fn();
const mockGetPermission = jest.fn();
const mockBarcode = { lookup: jest.fn(), scan: jest.fn(), undoScan: jest.fn() };
const mockMutations = { createProduct: jest.fn() };

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/shared/ui/actionSheet/actionSheet', () => ({ actionSheet: jest.fn() }));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  notifySuccess: jest.fn(),
  notifyWarning: jest.fn(),
}));
jest.mock('expo-camera', () => {
  const { View } = jest.requireActual('react-native');
  return {
    CameraView: (props: CameraProps) => {
      mockCamera.props = props;
      return <View testID="camera" />;
    },
    useCameraPermissions: () => [mockPermission.current, mockRequestPermission, mockGetPermission],
  };
});
jest.mock('../hooks/usePantryBarcode', () => ({ usePantryBarcode: () => mockBarcode }));
jest.mock('../hooks/usePantryMutations', () => ({ usePantryMutations: () => mockMutations }));

const COKE = '7790895000997';
const UNKNOWN = '7791234500000';
const MILK = product({ barcode: COKE });
const NOT_LINKED = new ApiError('El código no está vinculado', 404);
const SUGGESTION: PantryBarcodeSuggestion = {
  name: 'Coca Cola Original 2,25 L',
  brand: 'Coca-Cola',
  packageSize: '2,25 L',
  category: 'BEVERAGES',
  unit: 'PACKAGES',
  sourceUrl: `https://world.openfoodfacts.org/product/${COKE}`,
};

const ADDED_ONE_MILK = `Sumamos ${formatPantryQuantity(1, 'PACKAGES')} a Leche entera`;

function renderSheet() {
  return render(<ScanSheet open onOpenChange={jest.fn()} />);
}

/** Simula que la cámara leyó `data`, como lo reporta `onBarcodeScanned`. */
async function read(data: string, type = 'ean13') {
  await act(async () => {
    mockCamera.props?.onBarcodeScanned?.({ type, data });
  });
}

function submitButton() {
  return screen.getByRole('button', { name: 'Agregar producto' });
}

beforeEach(() => {
  jest.clearAllMocks();
  [...Object.values(mockBarcode), mockMutations.createProduct, jest.mocked(actionSheet)].forEach(mock =>
    mock.mockReset()
  );
  mockCamera.props = null;
  mockPermission.current = { granted: true, canAskAgain: true };
  mockRequestPermission.mockResolvedValue({ granted: true });
  mockGetPermission.mockResolvedValue({ granted: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('ScanSheet · permiso', () => {
  it('mientras se resuelve el permiso muestra la carga y no la cámara', () => {
    mockPermission.current = null;
    renderSheet();

    expect(screen.getByLabelText('Cargando')).toBeTruthy();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cargar a mano' })).toBeTruthy();
  });

  it('sin pedir todavía explica para qué es y Permitir cámara lo pide', () => {
    mockPermission.current = { granted: false, canAskAgain: true };
    renderSheet();

    expect(screen.getByText('Usá la cámara para escanear')).toBeTruthy();
    expect(screen.queryByTestId('camera')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Permitir cámara' }));
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('bloqueado sin poder preguntar ofrece Abrir Ajustes y Cargar a mano', () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    mockPermission.current = { granted: false, canAskAgain: false };
    renderSheet();

    expect(screen.getByText('La cámara está bloqueada para Omni')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Abrir Ajustes' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByRole('button', { name: 'Cargar a mano' }));
    expect(screen.getByLabelText(/Nombre/)).toBeTruthy();
  });

  it('si la cámara no abre muestra el error con reintento', async () => {
    renderSheet();

    await act(async () => mockCamera.props?.onMountError?.());

    expect(screen.getByText('No se pudo abrir la cámara')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(screen.getByTestId('camera')).toBeTruthy();
  });

  it('vuelve a leer el permiso cuando la app vuelve a primer plano', () => {
    const listen = jest.spyOn(AppState, 'addEventListener');
    mockPermission.current = { granted: false, canAskAgain: false };
    renderSheet();

    const onChange = listen.mock.calls.find(([type]) => type === 'change')![1];
    act(() => onChange('background'));
    expect(mockGetPermission).not.toHaveBeenCalled();
    act(() => onChange('active'));
    expect(mockGetPermission).toHaveBeenCalledTimes(1);
  });

  it('lee solo EAN-13, EAN-8 y UPC-A, y la linterna se prende y apaga', () => {
    renderSheet();

    expect(mockCamera.props?.barcodeScannerSettings?.barcodeTypes).toEqual(['ean13', 'ean8', 'upc_a']);
    fireEvent.press(screen.getByRole('button', { name: 'Encender linterna' }));
    expect(mockCamera.props?.enableTorch).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Apagar linterna' }));
    expect(mockCamera.props?.enableTorch).toBe(false);
  });
});

describe('ScanSheet · código ya en la alacena', () => {
  it('suma 1, deja la cámara abierta y Deshacer lo revierte', async () => {
    const scanned: PantryScanResult = { outcome: 'INCREMENTED', product: MILK };
    mockBarcode.scan.mockResolvedValue(scanned);
    mockBarcode.undoScan.mockResolvedValue({ codeKept: false });
    renderSheet();

    await read(COKE);

    expect(mockBarcode.scan).toHaveBeenCalledWith({ barcode: COKE });
    expect(mockBarcode.lookup).not.toHaveBeenCalled();
    expect(await screen.findByText(ADDED_ONE_MILK)).toBeTruthy();
    expect(screen.getByTestId('camera')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Deshacer' }));
    expect(await screen.findByText('Deshicimos el último escaneo')).toBeTruthy();
    expect(mockBarcode.undoScan).toHaveBeenCalledWith(scanned, 1);
    expect(screen.queryByRole('button', { name: 'Deshacer' })).toBeNull();
  });

  it('mientras deshace no lee códigos ni deja cerrar la hoja', async () => {
    let finishUndo: (value: { codeKept: boolean }) => void = () => {};
    mockBarcode.scan.mockResolvedValue({ outcome: 'INCREMENTED', product: MILK });
    mockBarcode.undoScan.mockReturnValue(new Promise(resolve => (finishUndo = resolve)));
    renderSheet();

    await read(COKE);
    fireEvent.press(await screen.findByRole('button', { name: 'Deshacer' }));

    expect(mockCamera.props?.onBarcodeScanned).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Cerrar' }).props.accessibilityState.disabled).toBe(true);
    await act(async () => finishUndo({ codeKept: false }));
    expect(mockCamera.props?.onBarcodeScanned).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cerrar' }).props.accessibilityState.disabled).toBe(false);
  });

  it('si al deshacer una vinculación el código queda vinculado lo avisa', async () => {
    mockBarcode.scan.mockResolvedValue({ outcome: 'LINKED', product: MILK });
    mockBarcode.undoScan.mockResolvedValue({ codeKept: true });
    renderSheet();

    await read(COKE);
    fireEvent.press(await screen.findByRole('button', { name: 'Deshacer' }));

    expect(await screen.findByText(/pero el código sigue vinculado. Quitalo desde el detalle./)).toBeTruthy();
  });

  it('si deshacer falla avisa y no ofrece repetirlo', async () => {
    mockBarcode.scan.mockResolvedValue({ outcome: 'INCREMENTED', product: MILK });
    mockBarcode.undoScan.mockRejectedValue(new Error('red'));
    renderSheet();

    await read(COKE);
    fireEvent.press(await screen.findByRole('button', { name: 'Deshacer' }));

    expect(await screen.findByText('No se pudo deshacer. Revisá Leche entera en el inventario.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Deshacer' })).toBeNull();
  });

  it('el mismo código que sigue a la vista no suma dos veces', async () => {
    mockBarcode.scan.mockResolvedValue({ outcome: 'INCREMENTED', product: MILK });
    renderSheet();

    await read(COKE);
    await read(COKE);
    await read(COKE);

    expect(mockBarcode.scan).toHaveBeenCalledTimes(1);
  });

  it('mientras resuelve un código la cámara sigue montada pero no lee', async () => {
    let finishScan: (value: PantryScanResult) => void = () => {};
    mockBarcode.scan.mockReturnValue(new Promise(resolve => (finishScan = resolve)));
    renderSheet();

    await read(COKE);

    expect(screen.getByLabelText(`Buscando el código ${COKE}`)).toBeTruthy();
    expect(screen.getByTestId('camera')).toBeTruthy();
    expect(mockCamera.props?.onBarcodeScanned).toBeUndefined();
    await act(async () => finishScan({ outcome: 'INCREMENTED', product: MILK }));
    expect(mockCamera.props?.onBarcodeScanned).toBeDefined();
  });

  it('el mismo código vuelve a sumar después de sacarlo de cuadro', async () => {
    jest.useFakeTimers({ now: 0 });
    mockBarcode.scan.mockResolvedValue({ outcome: 'INCREMENTED', product: MILK });
    renderSheet();

    await read(COKE);
    act(() => jest.advanceTimersByTime(2500));
    await read(COKE);

    expect(mockBarcode.scan).toHaveBeenCalledTimes(2);
  });

  it('un código vinculado entre la consulta y el escaneo vuelve a escanear', async () => {
    mockBarcode.scan.mockRejectedValueOnce(NOT_LINKED).mockResolvedValueOnce({ outcome: 'INCREMENTED', product: MILK });
    mockBarcode.lookup.mockResolvedValue({ status: 'IN_PANTRY', barcode: COKE, product: MILK });
    renderSheet();

    await read(COKE);

    expect(await screen.findByText(ADDED_ONE_MILK)).toBeTruthy();
    expect(mockBarcode.scan).toHaveBeenCalledTimes(2);
  });

  it('si lo desvinculan otra vez entre la consulta y el escaneo abre el alta', async () => {
    mockBarcode.scan.mockRejectedValue(NOT_LINKED);
    mockBarcode.lookup.mockResolvedValue({ status: 'IN_PANTRY', barcode: COKE, product: MILK });
    renderSheet();

    await read(COKE);

    expect(await screen.findByText(/No encontramos el código/)).toBeTruthy();
    expect(mockBarcode.scan).toHaveBeenCalledTimes(2);
  });
});

describe('ScanSheet · lecturas que no salen a la red', () => {
  it('ignora una lectura con dígito verificador inválido', async () => {
    renderSheet();

    await read('7790895000998');
    await read('12345');

    expect(mockBarcode.scan).not.toHaveBeenCalled();
    expect(mockBarcode.lookup).not.toHaveBeenCalled();
  });

  it('un código interno del comercio avisa sin consultar', async () => {
    renderSheet();

    await read('2000000000008');

    expect(screen.getByText(/Es un código interno del comercio/)).toBeTruthy();
    expect(mockBarcode.scan).not.toHaveBeenCalled();
    expect(screen.getByTestId('camera')).toBeTruthy();
  });

  it('un código interno no se lleva el Deshacer del escaneo anterior', async () => {
    mockBarcode.scan.mockResolvedValue({ outcome: 'INCREMENTED', product: MILK });
    renderSheet();

    await read(COKE);
    await read('2000000000008');

    expect(screen.getByText(/Es un código interno del comercio/)).toBeTruthy();
    expect(screen.getByText(ADDED_ONE_MILK)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeTruthy();
  });

  it('un UPC-A se normaliza a EAN-13 antes de consultar', async () => {
    mockBarcode.scan.mockResolvedValue({ outcome: 'INCREMENTED', product: MILK });
    renderSheet();

    await read('012345678905', 'upc_a');

    expect(mockBarcode.scan).toHaveBeenCalledWith({ barcode: '0012345678905' });
  });
});

describe('ScanSheet · código nuevo', () => {
  it('encontrado en Open Food Facts: alta precargada, link a la ficha y suma con el código', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mockBarcode.scan
      .mockRejectedValueOnce(NOT_LINKED)
      .mockResolvedValueOnce({ outcome: 'CREATED', product: product({ name: SUGGESTION.name, barcode: COKE }) });
    mockBarcode.lookup.mockResolvedValue({ status: 'FOUND', barcode: COKE, suggestion: SUGGESTION });
    renderSheet();

    await read(COKE);

    expect(await screen.findByDisplayValue('Coca Cola Original 2,25 L')).toBeTruthy();
    expect(screen.getByText(/Encontramos el producto en Open Food Facts/)).toBeTruthy();
    expect(screen.getByText(`Código ${COKE}`)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Ver en Open Food Facts' }));
    expect(openUrl).toHaveBeenCalledWith(SUGGESTION.sourceUrl);

    expect(submitButton().props.accessibilityState.disabled).toBe(false);
    fireEvent.press(submitButton());

    await waitFor(() =>
      expect(mockBarcode.scan).toHaveBeenLastCalledWith({
        barcode: COKE,
        quantity: 1,
        product: { name: SUGGESTION.name, category: 'BEVERAGES', unit: 'PACKAGES', minQuantity: null, expiresAt: null },
      })
    );
    expect(await screen.findByText('Agregamos Coca Cola Original 2,25 L')).toBeTruthy();
    expect(screen.getByTestId('camera')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeTruthy();
  });

  it('encontrado sin categoría pide elegirla antes de guardar', async () => {
    mockBarcode.scan.mockRejectedValueOnce(NOT_LINKED);
    mockBarcode.lookup.mockResolvedValue({
      status: 'FOUND',
      barcode: COKE,
      suggestion: { ...SUGGESTION, category: null },
    });
    renderSheet();

    await read(COKE);
    fireEvent.press(await screen.findByRole('button', { name: 'Agregar producto' }));

    expect(await screen.findAllByText('Elegí una categoría')).toHaveLength(2);
    expect(screen.getByText(/Elegí la categoría y revisá los datos/)).toBeTruthy();
    expect(mockBarcode.scan).toHaveBeenCalledTimes(1);
  });

  it('no encontrado: alta con el código guardado y cantidad mayor a cero', async () => {
    jest.mocked(actionSheet).mockResolvedValue('SNACKS');
    mockBarcode.scan.mockRejectedValueOnce(NOT_LINKED).mockResolvedValueOnce({
      outcome: 'LINKED',
      product: product({ name: 'Galletitas', barcode: UNKNOWN }),
    });
    mockBarcode.lookup.mockResolvedValue({ status: 'NOT_FOUND', barcode: UNKNOWN });
    renderSheet();

    await read(UNKNOWN);

    expect(await screen.findByText(`No encontramos el código ${UNKNOWN}. Cargalo y la próxima vez lo reconocemos.`));
    expect(submitButton().props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByLabelText(/Nombre/), 'Galletitas');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Categoría: Elegí una categoría' })));
    fireEvent.changeText(screen.getByLabelText(/Cantidad/), '0');
    fireEvent.press(submitButton());
    expect(await screen.findByText('Ingresá una cantidad mayor a cero')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText(/Cantidad/), '2');
    fireEvent.press(submitButton());

    expect(
      await screen.findByText(`Sumamos ${formatPantryQuantity(2, 'PACKAGES')} a Galletitas y guardamos el código`)
    ).toBeTruthy();
    expect(mockBarcode.scan).toHaveBeenLastCalledWith(
      expect.objectContaining({
        barcode: UNKNOWN,
        quantity: 2,
        product: expect.objectContaining({ name: 'Galletitas' }),
      })
    );
  });

  it('un nombre que ya tiene otro código suma y avisa que este no quedó guardado', async () => {
    mockBarcode.scan.mockRejectedValueOnce(NOT_LINKED).mockResolvedValueOnce({
      outcome: 'INCREMENTED',
      product: product({ name: SUGGESTION.name, barcode: '7622210449283' }),
    });
    mockBarcode.lookup.mockResolvedValue({ status: 'FOUND', barcode: COKE, suggestion: SUGGESTION });
    renderSheet();

    await read(COKE);
    fireEvent.press(await screen.findByRole('button', { name: 'Agregar producto' }));

    expect(await screen.findByText(/Ya tenía otro código, así que este no quedó guardado/)).toBeTruthy();
  });

  it('si el alta falla muestra el error en la hoja y conserva el formulario', async () => {
    mockBarcode.scan
      .mockRejectedValueOnce(NOT_LINKED)
      .mockRejectedValueOnce(new ApiError('La cantidad admite hasta dos decimales', 400));
    mockBarcode.lookup.mockResolvedValue({ status: 'FOUND', barcode: COKE, suggestion: SUGGESTION });
    renderSheet();

    await read(COKE);
    fireEvent.press(await screen.findByRole('button', { name: 'Agregar producto' }));

    expect(await screen.findByText('La cantidad admite hasta dos decimales')).toBeTruthy();
    expect(screen.getByDisplayValue('Coca Cola Original 2,25 L')).toBeTruthy();
    expect(screen.queryByTestId('camera')).toBeNull();
  });

  it.each([
    ['un error de red', new TypeError('Network request failed')],
    ['un timeout', new ApiError('La API tardó demasiado', 0)],
    ['un 504', new ApiError('El servidor no respondió', 504)],
  ])('%s al guardar el alta no deja volver a guardar, porque pudo haber sumado', async (_, error) => {
    mockBarcode.scan.mockRejectedValueOnce(NOT_LINKED).mockRejectedValueOnce(error);
    mockBarcode.lookup.mockResolvedValue({ status: 'FOUND', barcode: COKE, suggestion: SUGGESTION });
    renderSheet();

    await read(COKE);
    fireEvent.press(await screen.findByRole('button', { name: 'Agregar producto' }));

    expect(
      await screen.findByText('No sabemos si se guardó. Revisá el inventario antes de volver a escanearlo.')
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Agregar producto' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cargar a mano' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cerrar' }).props.accessibilityState.disabled).toBe(false);
    fireEvent.press(screen.getByRole('button', { name: 'Volver a escanear' }));
    expect(screen.getByTestId('camera')).toBeTruthy();
    expect(mockBarcode.scan).toHaveBeenCalledTimes(2);
  });

  it('al volver del alta, el producto que quedó en cuadro no suma otra vez', async () => {
    jest.useFakeTimers({ now: 0 });
    mockBarcode.scan
      .mockRejectedValueOnce(NOT_LINKED)
      .mockResolvedValueOnce({ outcome: 'CREATED', product: product({ name: SUGGESTION.name, barcode: COKE }) });
    mockBarcode.lookup.mockResolvedValue({ status: 'FOUND', barcode: COKE, suggestion: SUGGESTION });
    renderSheet();

    await read(COKE);
    await act(async () => jest.advanceTimersByTime(5000));
    fireEvent.press(screen.getByRole('button', { name: 'Agregar producto' }));
    await act(async () => jest.advanceTimersByTime(0));
    expect(screen.getByText(`Agregamos ${SUGGESTION.name}`)).toBeTruthy();

    await act(async () => jest.advanceTimersByTime(3000));
    act(() => mockCamera.props?.onCameraReady?.());
    await read(COKE);
    await act(async () => jest.advanceTimersByTime(500));
    await read(COKE);

    expect(mockBarcode.scan).toHaveBeenCalledTimes(2);
  });

  it('Volver a escanear descarta el alta y vuelve a la cámara', async () => {
    mockBarcode.scan.mockRejectedValueOnce(NOT_LINKED);
    mockBarcode.lookup.mockResolvedValue({ status: 'NOT_FOUND', barcode: UNKNOWN });
    renderSheet();

    await read(UNKNOWN);
    fireEvent.press(await screen.findByRole('button', { name: 'Volver a escanear' }));

    expect(screen.getByTestId('camera')).toBeTruthy();
  });
});

describe('ScanSheet · errores', () => {
  it('un error del catálogo no se muestra como no encontrado: Reintentar vuelve a consultar', async () => {
    mockBarcode.scan.mockRejectedValue(NOT_LINKED);
    mockBarcode.lookup
      .mockRejectedValueOnce(new ApiError('El catálogo de productos no está disponible', 503))
      .mockResolvedValueOnce({ status: 'NOT_FOUND', barcode: UNKNOWN });
    renderSheet();

    await read(UNKNOWN);

    expect(await screen.findByText('El catálogo de productos no está disponible')).toBeTruthy();
    expect(screen.queryByText(/No encontramos el código/)).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(/No encontramos el código/)).toBeTruthy();
    expect(mockBarcode.lookup).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['un error de red', new TypeError('Network request failed')],
    ['un timeout', new ApiError('La API tardó demasiado', 0)],
    ['un 504', new ApiError('El servidor no respondió', 504)],
  ])('%s al escanear no ofrece reintentar ni cargar a mano, porque pudo haber sumado', async (_, error) => {
    mockBarcode.scan.mockRejectedValueOnce(error);
    renderSheet();

    await read(COKE);

    expect(
      await screen.findByText('No sabemos si se sumó. Revisá el inventario antes de volver a escanearlo.')
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cargar a mano' })).toBeNull();
    expect(mockBarcode.lookup).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Volver a escanear' }));
    expect(screen.getByTestId('camera')).toBeTruthy();
  });

  it('un error de red en la consulta usa el mensaje genérico y Cargar a mano conserva el código', async () => {
    mockBarcode.scan.mockRejectedValueOnce(NOT_LINKED);
    mockBarcode.lookup.mockRejectedValueOnce(new TypeError('Network request failed'));
    renderSheet();

    await read(UNKNOWN);

    expect(await screen.findByText('No se pudo buscar el código')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Cargar a mano' }));
    expect(screen.getByText(/No pudimos consultar el catálogo/)).toBeTruthy();
    expect(screen.getByText(`Código ${UNKNOWN}`)).toBeTruthy();
  });

  it.each([
    ['un 429', new ApiError('Demasiadas solicitudes', 429)],
    ['un 500 de la API, que revirtió el escaneo', new ApiError('Error interno del servidor', 500)],
  ])('%s al escanear se puede reintentar', async (_, error) => {
    mockBarcode.scan.mockRejectedValueOnce(error).mockResolvedValueOnce({ outcome: 'INCREMENTED', product: MILK });
    renderSheet();

    await read(COKE);
    fireEvent.press(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText(ADDED_ONE_MILK)).toBeTruthy();
  });
});

describe('ScanSheet · cierre', () => {
  it('con la hoja cerrándose la cámara deja de leer', () => {
    const view = renderSheet();

    expect(mockCamera.props?.onBarcodeScanned).toBeDefined();
    view.rerender(<ScanSheet open={false} onOpenChange={jest.fn()} />);
    expect(mockCamera.props?.onBarcodeScanned).toBeUndefined();
  });

  it('un escaneo que termina con la hoja cerrada se avisa al terminar de cerrarse', async () => {
    jest.useFakeTimers();
    let finishScan: (value: PantryScanResult) => void = () => {};
    mockBarcode.scan.mockReturnValue(new Promise(resolve => (finishScan = resolve)));
    const view = renderSheet();

    await read(COKE);
    view.rerender(<ScanSheet open={false} onOpenChange={jest.fn()} />);
    await act(async () => finishScan({ outcome: 'INCREMENTED', product: MILK }));
    expect(notifySuccess).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(700));

    expect(notifySuccess).toHaveBeenCalledWith(ADDED_ONE_MILK);
  });

  it('un escaneo que termina después de cerrar la hoja se avisa con un toast', async () => {
    jest.useFakeTimers();
    let finishScan: (value: PantryScanResult) => void = () => {};
    mockBarcode.scan.mockReturnValue(new Promise(resolve => (finishScan = resolve)));
    const view = renderSheet();

    await read(COKE);
    view.rerender(<ScanSheet open={false} onOpenChange={jest.fn()} />);
    await act(async () => jest.advanceTimersByTime(700));
    await act(async () => finishScan({ outcome: 'INCREMENTED', product: MILK }));

    expect(notifySuccess).toHaveBeenCalledWith(ADDED_ONE_MILK);
  });
});

describe('ScanSheet · carga a mano', () => {
  it('sin código da de alta con el alta común', async () => {
    jest.mocked(actionSheet).mockResolvedValue('GRAINS');
    mockMutations.createProduct.mockResolvedValue(product({ name: 'Arroz' }));
    renderSheet();

    fireEvent.press(screen.getByRole('button', { name: 'Cargar a mano' }));
    expect(submitButton().props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByLabelText(/Nombre/), 'Arroz');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Categoría: Elegí una categoría' })));
    fireEvent.changeText(screen.getByLabelText(/Cantidad/), '1');
    fireEvent.press(submitButton());

    expect(await screen.findByText('Agregamos Arroz')).toBeTruthy();
    expect(mockMutations.createProduct).toHaveBeenCalledWith(expect.objectContaining({ name: 'Arroz', quantity: 1 }));
    expect(mockBarcode.scan).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Deshacer' })).toBeNull();
  });
});
