import { AVATAR_MAX_BYTES } from '@omni/shared/users';

import {
  AVATAR_READ_ERROR,
  AVATAR_SIZE_ERROR,
  AVATAR_TYPE_ERROR,
  buildAvatarForm,
  validateAvatarAsset,
} from './profilePhoto';

const mockFiles: { uri: string; exists: boolean }[] = [];
let mockFileExists = true;
let mockFileThrows = false;

jest.mock('expo-file-system', () => ({
  File: function File(this: { uri: string; exists: boolean }, uri: string) {
    if (mockFileThrows) throw new Error('invalid uri');
    this.uri = uri;
    this.exists = mockFileExists;
    mockFiles.push(this);
  },
}));

beforeEach(() => {
  mockFiles.length = 0;
  mockFileExists = true;
  mockFileThrows = false;
});

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

describe('buildAvatarForm', () => {
  afterEach(() => jest.restoreAllMocks());

  it('agrega el File del archivo al campo avatar', () => {
    const spy = jest.spyOn(FormData.prototype, 'append');
    buildAvatarForm({ uri: 'file:///cache/a.png', mimeType: 'image/png', fileName: 'a.png' });

    expect(mockFiles).toHaveLength(1);
    expect(mockFiles[0].uri).toBe('file:///cache/a.png');
    expect(spy).toHaveBeenCalledWith('avatar', mockFiles[0]);
  });

  it('acepta uris content:// de la galería', () => {
    const spy = jest.spyOn(FormData.prototype, 'append');
    buildAvatarForm({ uri: 'content://media/external/images/media/42' });

    expect(mockFiles[0].uri).toBe('content://media/external/images/media/42');
    expect(spy).toHaveBeenCalledWith('avatar', mockFiles[0]);
  });

  it('lanza AVATAR_READ_ERROR sin armar el form si el archivo no existe', () => {
    const spy = jest.spyOn(FormData.prototype, 'append');
    mockFileExists = false;

    expect(() => buildAvatarForm({ uri: 'file:///cache/a.png' })).toThrow(AVATAR_READ_ERROR);
    expect(spy).not.toHaveBeenCalled();
  });

  it('lanza AVATAR_READ_ERROR si la uri es inválida', () => {
    mockFileThrows = true;

    expect(() => buildAvatarForm({ uri: '' })).toThrow(AVATAR_READ_ERROR);
  });
});
