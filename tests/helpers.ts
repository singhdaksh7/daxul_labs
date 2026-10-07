import { Buffer } from 'node:buffer';

/** Minimal valid-looking fixtures (signature + structure checked by the storage layer). */
export function tinyPng(): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('IHDR', 'ascii'),
    Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]),
    Buffer.from([0x1f, 0x15, 0xc4, 0x89]),
  ]);
  const iend = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  return Buffer.concat([sig, ihdr, iend]);
}

export function tinyJpeg(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);
}

export function tinyWebp(): Buffer {
  return Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.from([0x1a, 0, 0, 0]),
    Buffer.from('WEBPVP8 ', 'ascii'),
    Buffer.alloc(14),
  ]);
}

export function tinyPdf(): Buffer {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n', 'ascii');
}
