import { AVATAR_MAX_BYTES } from '@omni/shared/users';

import {
  AVATAR_READ_ERROR,
  AVATAR_SIZE_ERROR,
  AVATAR_TYPE_ERROR,
  buildAvatarForm,
  validateAvatarAsset,
} from './profilePhoto';

describe('validateAvatarAsset', () => {
  it('acepta JPG, PNG y WebP de hasta 2MB', () => {
    expect(validateAvatarAsset({ mimeType: 'image/jpeg', fileSize: 1000 })).toBeNull();
    expect(validateAvatarAsset({ mimeType: 'image/png', fileSize: AVATAR_MAX_BYTES })).toBeNull();
    expect(validateAvatarAsset({ mimeType: 'image/webp' })).toBeNull();
  });

  it('sin tipo ni peso informados no rechaza: lo valida la API', () => {
    expect(validateAvatarAsset({})).toBeNull();
  });

  it('rechaza GIF y otros tipos', () => {
    expect(validateAvatarAsset({ mimeType: 'image/gif', fileSize: 1000 })).toBe(AVATAR_TYPE_ERROR);
  });

  it('rechaza imágenes de más de 2MB', () => {
    expect(validateAvatarAsset({ mimeType: 'image/png', fileSize: AVATAR_MAX_BYTES + 1 })).toBe(AVATAR_SIZE_ERROR);
  });
});

type AvatarPart = { uri: string; name: string; type: string; bytes: () => Promise<Uint8Array> };

const partOf = () => {
  const append = jest.spyOn(FormData.prototype, 'append');
  return { append, get: () => append.mock.calls[0][1] as unknown as AvatarPart };
};

describe('buildAvatarForm', () => {
  afterEach(() => jest.restoreAllMocks());

  it('arma el campo avatar con uri, nombre y tipo', () => {
    const spy = jest.spyOn(FormData.prototype, 'append');
    buildAvatarForm({ uri: 'file:///a.png', mimeType: 'image/png', fileName: 'a.png' });

    expect(spy).toHaveBeenCalledWith('avatar', { uri: 'file:///a.png', name: 'a.png', type: 'image/png' });
  });

  it('usa valores por defecto sin nombre ni tipo', () => {
    const spy = jest.spyOn(FormData.prototype, 'append');
    buildAvatarForm({ uri: 'file:///a' });

    expect(spy).toHaveBeenCalledWith('avatar', { uri: 'file:///a', name: 'avatar', type: 'image/jpeg' });
  });

  it('expone bytes() sin enumerarlo: el FormData de RN copia solo uri, name y type', () => {
    const spy = jest.spyOn(FormData.prototype, 'append');
    buildAvatarForm({ uri: 'file:///a.png', mimeType: 'image/png', fileName: 'a.png' });
    const part = spy.mock.calls[0][1] as unknown as AvatarPart;

    expect(typeof part.bytes).toBe('function');
    expect(Object.keys(part)).toEqual(['uri', 'name', 'type']);
    expect({ ...part }).toEqual({ uri: 'file:///a.png', name: 'a.png', type: 'image/png' });
  });
});

describe('buildAvatarForm: lectura de bytes (expo/fetch)', () => {
  const originalXhr = global.XMLHttpRequest;
  const originalReader = global.FileReader;

  afterEach(() => {
    jest.restoreAllMocks();
    global.XMLHttpRequest = originalXhr;
    global.FileReader = originalReader;
  });

  const stubXhr = (outcome: 'load' | 'error') => {
    const blob = { size: 3 };
    const open = jest.fn();
    class FakeXhr {
      responseType = '';
      response = blob;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      open = open;
      send = () => (outcome === 'load' ? this.onload?.() : this.onerror?.());
    }
    global.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
    return { blob, open };
  };

  const stubReader = (outcome: 'load' | 'error') => {
    const readAsArrayBuffer = jest.fn();
    class FakeReader {
      result: ArrayBuffer | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsArrayBuffer = (blob: unknown) => {
        readAsArrayBuffer(blob);
        this.result = new Uint8Array([1, 2, 3]).buffer;
        if (outcome === 'load') this.onload?.();
        else this.onerror?.();
      };
    }
    global.FileReader = FakeReader as unknown as typeof FileReader;
    return readAsArrayBuffer;
  };

  it('bytes() lee el archivo de la uri como blob y devuelve su contenido', async () => {
    const { blob, open } = stubXhr('load');
    const readAsArrayBuffer = stubReader('load');
    const { get } = partOf();
    buildAvatarForm({ uri: 'file:///a.png', mimeType: 'image/png', fileName: 'a.png' });

    await expect(get().bytes()).resolves.toEqual(new Uint8Array([1, 2, 3]));
    expect(open).toHaveBeenCalledWith('GET', 'file:///a.png');
    expect(readAsArrayBuffer).toHaveBeenCalledWith(blob);
  });

  it('bytes() rechaza si no se puede abrir el archivo', async () => {
    stubXhr('error');
    const { get } = partOf();
    buildAvatarForm({ uri: 'file:///a.png' });

    await expect(get().bytes()).rejects.toThrow(AVATAR_READ_ERROR);
  });

  it('bytes() rechaza si falla la lectura del blob', async () => {
    stubXhr('load');
    stubReader('error');
    const { get } = partOf();
    buildAvatarForm({ uri: 'file:///a.png' });

    await expect(get().bytes()).rejects.toThrow(AVATAR_READ_ERROR);
  });
});
