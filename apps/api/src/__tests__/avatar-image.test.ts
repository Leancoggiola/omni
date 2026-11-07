import { describe, expect, it } from 'vitest';

import { gifBytes, jpegBytes, pngBytes, svgBytes, webpBytes } from '../test/avatar-images';
import { detectAvatarImage } from '../users/avatar-image';

describe('detectAvatarImage', () => {
  it('reconoce JPEG, PNG y WebP por sus primeros bytes', () => {
    expect(detectAvatarImage(jpegBytes())).toEqual({ mime: 'image/jpeg', extension: 'jpg' });
    expect(detectAvatarImage(pngBytes())).toEqual({ mime: 'image/png', extension: 'png' });
    expect(detectAvatarImage(webpBytes())).toEqual({ mime: 'image/webp', extension: 'webp' });
  });

  it('rechaza GIF (87a y 89a) y SVG', () => {
    expect(detectAvatarImage(gifBytes())).toBeNull();
    expect(detectAvatarImage(Buffer.from('GIF87a-datos', 'ascii'))).toBeNull();
    expect(detectAvatarImage(svgBytes())).toBeNull();
  });

  it('rechaza un RIFF que no es WebP (por ejemplo WAV)', () => {
    const wav = Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.alloc(4), Buffer.from('WAVEfmt ', 'ascii')]);

    expect(detectAvatarImage(wav)).toBeNull();
  });

  it('rechaza texto, ejecutables y buffers vacíos o truncados', () => {
    expect(detectAvatarImage(Buffer.from('esto no es una imagen'))).toBeNull();
    expect(detectAvatarImage(Buffer.from('MZ\x90\x00', 'binary'))).toBeNull();
    expect(detectAvatarImage(Buffer.alloc(0))).toBeNull();
    expect(detectAvatarImage(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(detectAvatarImage(pngBytes().subarray(0, 7))).toBeNull();
    expect(detectAvatarImage(webpBytes().subarray(0, 11))).toBeNull();
  });
});
