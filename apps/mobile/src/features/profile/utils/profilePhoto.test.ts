import { AVATAR_SIZE_ERROR, AVATAR_TYPE_ERROR, MAX_AVATAR_SIZE_BYTES, validateAvatarAsset } from './profilePhoto';

describe('validateAvatarAsset', () => {
  it('acepta JPG, PNG y GIF de hasta 5MB', () => {
    expect(validateAvatarAsset({ mimeType: 'image/jpeg', fileSize: 1000 })).toBeNull();
    expect(validateAvatarAsset({ mimeType: 'image/png', fileSize: MAX_AVATAR_SIZE_BYTES })).toBeNull();
    expect(validateAvatarAsset({ mimeType: 'image/gif' })).toBeNull();
  });

  it('rechaza otros tipos de imagen', () => {
    expect(validateAvatarAsset({ mimeType: 'image/webp', fileSize: 1000 })).toBe(AVATAR_TYPE_ERROR);
  });

  it('rechaza imágenes de más de 5MB', () => {
    expect(validateAvatarAsset({ mimeType: 'image/png', fileSize: MAX_AVATAR_SIZE_BYTES + 1 })).toBe(AVATAR_SIZE_ERROR);
  });
});
