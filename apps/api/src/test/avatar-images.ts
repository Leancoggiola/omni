/** Cabeceras mínimas de cada formato, rellenadas hasta `size` bytes: alcanzan para la detección por magic bytes. */
function withHeader(header: Buffer, size: number): Buffer {
  return Buffer.concat([header, Buffer.alloc(Math.max(size - header.length, 0), 0x2a)]);
}

export function pngBytes(size = 64): Buffer {
  return withHeader(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), size);
}

export function jpegBytes(size = 64): Buffer {
  return withHeader(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), size);
}

export function webpBytes(size = 64): Buffer {
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(Math.max(size - 8, 4), 4);
  header.write('WEBP', 8, 'ascii');
  return withHeader(header, size);
}

export function gifBytes(size = 64): Buffer {
  return withHeader(Buffer.from('GIF89a', 'ascii'), size);
}

export function svgBytes(): Buffer {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'utf8');
}
