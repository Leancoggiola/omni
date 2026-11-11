import { act, renderHook } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { API_KEYS } from '@/shared/api';

import { product } from '../fixtures';
import { usePantryBarcode } from './usePantryBarcode';

import type { PantryScanResult } from '@omni/shared/pantry';
import type { ReactNode } from 'react';

const mockApi = { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() };
const mockMutate = jest.fn();

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api/keys'),
  api: {
    get: (...args: unknown[]) => mockApi.get(...args),
    post: (...args: unknown[]) => mockApi.post(...args),
    patch: (...args: unknown[]) => mockApi.patch(...args),
    delete: (...args: unknown[]) => mockApi.delete(...args),
  },
}));
jest.mock('swr', () => ({
  ...jest.requireActual('swr'),
  useSWRConfig: () => ({ mutate: mockMutate }),
}));

const BARCODE = '7790895000997';
const MILK = product({ barcode: BARCODE });

function Wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

function renderBarcodeHook() {
  return renderHook(() => usePantryBarcode(), { wrapper: Wrapper }).result;
}

/** Devuelve el filtro con el que se revalidó la caché en la llamada `call`. */
function revalidatedFilter(call = 0) {
  return mockMutate.mock.calls[call]![0] as (key: unknown) => boolean;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMutate.mockResolvedValue(undefined);
});

describe('usePantryBarcode', () => {
  it('lookup consulta el código sin revalidar nada', async () => {
    mockApi.get.mockResolvedValue({ status: 'NOT_FOUND', barcode: BARCODE });
    const result = renderBarcodeHook();

    await expect(result.current.lookup(BARCODE)).resolves.toEqual({ status: 'NOT_FOUND', barcode: BARCODE });
    expect(mockApi.get).toHaveBeenCalledWith(API_KEYS.pantry.barcode(BARCODE));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('scan registra el escaneo y revalida las keys de la alacena', async () => {
    const scanned: PantryScanResult = { outcome: 'INCREMENTED', product: MILK };
    mockApi.post.mockResolvedValue(scanned);
    const result = renderBarcodeHook();

    await act(async () => {
      await expect(result.current.scan({ barcode: BARCODE })).resolves.toEqual(scanned);
    });

    expect(mockApi.post).toHaveBeenCalledWith(API_KEYS.pantry.productsScan, { barcode: BARCODE });
    expect(revalidatedFilter()(API_KEYS.pantry.summary)).toBe(true);
    expect(revalidatedFilter()('/api/media/list')).toBe(false);
  });

  it('un escaneo que falla no revalida y propaga el error', async () => {
    mockApi.post.mockRejectedValue(new Error('500'));
    const result = renderBarcodeHook();

    await expect(result.current.scan({ barcode: BARCODE })).rejects.toThrow('500');
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('la revalidación que falla no rompe el escaneo', async () => {
    mockApi.post.mockResolvedValue({ outcome: 'INCREMENTED', product: MILK });
    mockMutate.mockRejectedValue(new Error('cache'));
    const result = renderBarcodeHook();

    await expect(result.current.scan({ barcode: BARCODE })).resolves.toMatchObject({ outcome: 'INCREMENTED' });
  });

  it('deshacer una suma resta la cantidad con /stock', async () => {
    const result = renderBarcodeHook();

    await act(() => result.current.undoScan({ outcome: 'INCREMENTED', product: MILK }, 1.5));

    expect(mockApi.post).toHaveBeenCalledWith(API_KEYS.pantry.productStock(MILK.id), { delta: -1.5 });
    expect(mockApi.patch).not.toHaveBeenCalled();
    expect(mockApi.delete).not.toHaveBeenCalled();
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('deshacer una vinculación resta y suelta el código', async () => {
    const result = renderBarcodeHook();

    mockApi.patch.mockResolvedValue(MILK);
    let undone: { codeKept: boolean } | undefined;
    await act(async () => {
      undone = await result.current.undoScan({ outcome: 'LINKED', product: MILK }, 2);
    });

    expect(mockApi.post).toHaveBeenCalledWith(API_KEYS.pantry.productStock(MILK.id), { delta: -2 });
    expect(mockApi.patch).toHaveBeenCalledWith(API_KEYS.pantry.product(MILK.id), { barcode: null });
    expect(undone).toEqual({ codeKept: false });
  });

  it('si la resta sale y falla soltar el código, avisa que el código quedó y revalida', async () => {
    mockApi.patch.mockRejectedValue(new Error('500'));
    const result = renderBarcodeHook();

    await expect(result.current.undoScan({ outcome: 'LINKED', product: MILK }, 1)).resolves.toEqual({
      codeKept: true,
    });
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('deshacer un alta borra el producto y no revalida su detalle', async () => {
    const result = renderBarcodeHook();

    await act(() => result.current.undoScan({ outcome: 'CREATED', product: MILK }, 1));

    expect(mockApi.delete).toHaveBeenCalledWith(API_KEYS.pantry.product(MILK.id));
    expect(mockApi.post).not.toHaveBeenCalled();
    expect(revalidatedFilter()(API_KEYS.pantry.product(MILK.id))).toBe(false);
    expect(revalidatedFilter()(API_KEYS.pantry.products)).toBe(true);
  });

  it('si falla la resta no suelta el código', async () => {
    mockApi.post.mockRejectedValue(new Error('500'));
    const result = renderBarcodeHook();

    await expect(result.current.undoScan({ outcome: 'LINKED', product: MILK }, 1)).rejects.toThrow('500');
    expect(mockApi.patch).not.toHaveBeenCalled();
  });
});
