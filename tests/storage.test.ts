import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LocalStorageService, UploadValidationError, InvalidStorageKeyError } from '@/lib/storage';
import { tinyPng, tinyJpeg, tinyWebp, tinyPdf } from './helpers';

const ALL = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
let dir: string;
let outside: string;
let svc: LocalStorageService;

beforeEach(() => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'daxul-storage-'));
  dir = path.join(base, 'uploads');
  outside = path.join(base, 'secret.txt');
  fs.writeFileSync(outside, 'do not delete');
  process.env.STORAGE_PATH = dir;
  svc = new LocalStorageService();
});
afterEach(() => {
  fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  delete process.env.STORAGE_PATH;
});

const files = () => fs.readdirSync(dir);
async function expectRejected(buf: Buffer, name: string, mime: string, code: string, opts = {}) {
  const err = await svc.uploadFile(buf, name, mime, { allowedMimeTypes: ALL, ...opts }).catch((e) => e);
  expect(err).toBeInstanceOf(UploadValidationError);
  expect(err.code).toBe(code);
  expect(files()).toHaveLength(0); // nothing written
}

describe('upload validation (typed UploadValidationError, nothing written)', () => {
  it('rejects PNG header only (8 bytes)', async () => {
    const png8 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await expectRejected(png8, 'a.png', 'image/png', 'BAD_SIGNATURE');
  });
  it('rejects text renamed .png', async () => {
    await expectRejected(Buffer.from('hello this is just text, definitely not a png'), 'a.png', 'image/png', 'BAD_SIGNATURE');
  });
  it('rejects wrong magic bytes for each type', async () => {
    const junk = Buffer.from('x'.repeat(64));
    await expectRejected(junk, 'a.jpg', 'image/jpeg', 'BAD_SIGNATURE');
    await expectRejected(junk, 'a.webp', 'image/webp', 'BAD_SIGNATURE');
    await expectRejected(junk, 'a.pdf', 'application/pdf', 'BAD_SIGNATURE');
  });
  it('rejects a PNG declared as JPEG (mime mismatch)', async () => {
    await expectRejected(tinyPng(), 'a.jpg', 'image/jpeg', 'BAD_SIGNATURE');
  });
  it('rejects empty files', async () => {
    await expectRejected(Buffer.alloc(0), 'a.png', 'image/png', 'EMPTY_FILE');
  });
  it('rejects disallowed mime', async () => {
    await expectRejected(tinyPng(), 'a.png', 'image/svg+xml', 'INVALID_TYPE');
    await expectRejected(tinyPng(), 'a.png', 'text/html', 'INVALID_TYPE');
  });
  it('rejects oversize (TOO_LARGE -> 413)', async () => {
    const err = await svc
      .uploadFile(tinyPng(), 'a.png', 'image/png', { allowedMimeTypes: ALL, maxSizeBytes: 10 })
      .catch((e) => e);
    expect(err).toBeInstanceOf(UploadValidationError);
    expect(err.code).toBe('TOO_LARGE');
    expect(err.status).toBe(413);
    expect(files()).toHaveLength(0);
  });
  it('rejects executable extensions', async () => {
    await expectRejected(tinyPng(), 'evil.exe', 'image/png', 'FORBIDDEN_EXTENSION');
    await expectRejected(tinyPng(), 'evil.PHP', 'image/png', 'FORBIDDEN_EXTENSION');
    await expectRejected(tinyPng(), 'evil.html', 'image/png', 'FORBIDDEN_EXTENSION');
  });
  it('rejects double extensions', async () => {
    await expectRejected(tinyPng(), 'shell.php.png', 'image/png', 'FORBIDDEN_EXTENSION');
    await expectRejected(tinyPng(), 'a.sh.jpg', 'image/png', 'FORBIDDEN_EXTENSION');
  });
  it('rejects SVG with scripts', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expectRejected(svg, 'a.svg', 'image/svg+xml', 'UNSAFE_CONTENT', { allowedMimeTypes: ['image/svg+xml'] });
  });
});

describe('valid uploads accepted', () => {
  it.each([
    ['png', 'image/png', tinyPng],
    ['jpg', 'image/jpeg', tinyJpeg],
    ['webp', 'image/webp', tinyWebp],
    ['pdf', 'application/pdf', tinyPdf],
  ])('%s', async (ext, mime, make) => {
    const res = await svc.uploadFile(make(), `art.${ext}`, mime, { allowedMimeTypes: ALL });
    expect(res.filename).toMatch(new RegExp(`^[0-9a-f]{32}\\.${ext}$`));
    expect(files()).toEqual([res.filename]);
    expect(fs.readFileSync(path.join(dir, res.filename)).equals(make())).toBe(true);
  });
  it('stored extension is derived from mime, not the user name', async () => {
    const res = await svc.uploadFile(tinyPng(), 'x.weird', 'image/png', { allowedMimeTypes: ALL });
    expect(res.filename.endsWith('.png')).toBe(true);
  });
});

describe('deleteFile', () => {
  it('deletes an existing object and is idempotent', async () => {
    const res = await svc.uploadFile(tinyPng(), 'a.png', 'image/png', { allowedMimeTypes: ALL });
    await svc.deleteFile(res.filename);
    expect(files()).toHaveLength(0);
    await expect(svc.deleteFile(res.filename)).resolves.toBeUndefined(); // ENOENT = success
  });
  it('refuses traversal attempts and leaves outside files untouched', async () => {
    for (const key of ['../secret.txt', '..\\secret.txt', '/etc/passwd', 'a/../../secret.txt', '..', '.', '', 'sub/file.png', 'a\0b']) {
      await expect(svc.deleteFile(key)).rejects.toBeInstanceOf(InvalidStorageKeyError);
    }
    expect(fs.readFileSync(outside, 'utf8')).toBe('do not delete');
  });
  it('does not delete sibling files', async () => {
    const a = await svc.uploadFile(tinyPng(), 'a.png', 'image/png', { allowedMimeTypes: ALL });
    const b = await svc.uploadFile(tinyJpeg(), 'b.jpg', 'image/jpeg', { allowedMimeTypes: ALL });
    await svc.deleteFile(a.filename);
    expect(files()).toEqual([b.filename]);
  });
});
