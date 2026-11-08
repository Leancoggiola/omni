import { AVATAR_MAX_BYTES } from '@omni/shared/users';

import { AVATAR_SIZE_ERROR, AVATAR_TYPE_ERROR, buildAvatarForm, validateAvatarAsset } from './profilePhoto';

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

  it('arma el campo avatar con uri, nombre y tipo', () => {
    const append = jest.spyOn(FormData.prototype, 'append');
    buildAvatarForm({ uri: 'file:///a.png', mimeType: 'image/png', fileName: 'a.png' });

    expect(append).toHaveBeenCalledWith('avatar', { uri: 'file:///a.png', name: 'a.png', type: 'image/png' });
  });

  it('usa valores por defecto sin nombre ni tipo', () => {
    const append = jest.spyOn(FormData.prototype, 'append');
    buildAvatarForm({ uri: 'file:///a' });

    expect(append).toHaveBeenCalledWith('avatar', { uri: 'file:///a', name: 'avatar', type: 'image/jpeg' });
  });
});
