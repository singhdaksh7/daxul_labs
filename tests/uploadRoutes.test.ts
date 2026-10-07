import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tinyPng } from './helpers';

const state = vi.hoisted(() => ({
  uploadedRows: [] as any[],
  mediaRows: new Map<string, any>(),
  usages: [] as any[],
  logs: [] as any[],
}));

vi.mock('@/lib/auth', () => ({
  getAuthSession: async () => null,
  requireAdminSession: async () => ({ authorized: true, reason: 'Authorized', session: { user: { id: 'a1', email: 'a@x.com', role: 'ADMIN' } }, role: 'ADMIN' }),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    uploadedFile: { create: async ({ data }: any) => void state.uploadedRows.push(data) },
    mediaAsset: {
      create: async ({ data }: any) => {
        const row = { id: `m${state.mediaRows.size + 1}`, createdAt: new Date(), ...data };
        state.mediaRows.set(row.id, row);
        return row;
      },
      findUnique: async ({ where }: any) => state.mediaRows.get(where.id) ?? null,
      delete: async ({ where }: any) => void state.mediaRows.delete(where.id),
    },
    auditLog: { create: async ({ data }: any) => void state.logs.push(data) },
  },
}));
vi.mock('@/lib/mediaUsage', () => ({ findMediaUsages: async () => state.usages }));

import { POST as customerUpload } from '@/app/api/upload/route';
import { POST as adminUpload, DELETE as adminDelete } from '@/app/api/admin/cms/media/route';

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'daxul-routes-'));
  process.env.STORAGE_PATH = path.join(dir, 'uploads');
  delete process.env.STORAGE_PROVIDER;
  state.uploadedRows = [];
  state.mediaRows.clear();
  state.usages = [];
  state.logs = [];
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const stored = () => fs.readdirSync(process.env.STORAGE_PATH!);
function form(buf: Buffer, name: string, type: string) {
  const fd = new FormData();
  fd.set('file', new File([new Uint8Array(buf)], name, { type }));
  return fd;
}
const post = (url: string, fd: FormData, ip = '5.5.5.5') =>
  new Request(`http://localhost${url}`, { method: 'POST', body: fd, headers: { 'x-forwarded-for': ip } });

describe.each([
  ['POST /api/upload', (fd: FormData, ip?: string) => customerUpload(post('/api/upload', fd, ip) as any)],
  ['POST /api/admin/cms/media', (fd: FormData) => adminUpload(post('/api/admin/cms/media', fd))],
])('%s', (_n, call) => {
  it('PNG header only -> 400, nothing stored, no DB row', async () => {
    const png8 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const res = await call(form(png8, 'a.png', 'image/png'), '7.7.7.1');
    expect(res.status).toBe(400);
    expect(stored()).toHaveLength(0);
    expect(state.uploadedRows).toHaveLength(0);
    expect(state.mediaRows.size).toBe(0);
  });
  it('text renamed .png -> 400', async () => {
    const res = await call(form(Buffer.from('plain text file'), 'a.png', 'image/png'), '7.7.7.2');
    expect(res.status).toBe(400);
    expect(stored()).toHaveLength(0);
  });
  it('wrong mime -> 400, executable extension -> 400', async () => {
    expect((await call(form(tinyPng(), 'a.png', 'text/html'), '7.7.7.3')).status).toBe(400);
    expect((await call(form(tinyPng(), 'a.php.png', 'image/png'), '7.7.7.4')).status).toBe(400);
    expect(stored()).toHaveLength(0);
  });
  it('valid PNG -> 200, one object, one row', async () => {
    const res = await call(form(tinyPng(), 'a.png', 'image/png'), '7.7.7.5');
    expect(res.status).toBe(200);
    expect(stored()).toHaveLength(1);
    expect(state.uploadedRows.length + state.mediaRows.size).toBe(1);
  });
});

describe('DELETE /api/admin/cms/media', () => {
  const del = (id: string) => adminDelete(new Request(`http://localhost/api/admin/cms/media?id=${id}`, { method: 'DELETE' }));

  async function seed() {
    const res = await adminUpload(post('/api/admin/cms/media', form(tinyPng(), 'a.png', 'image/png')));
    expect(res.status).toBe(200);
    return [...state.mediaRows.values()][0];
  }

  it('deletes the stored object and the DB row, and audit-logs without secrets', async () => {
    const asset = await seed();
    const res = await del(asset.id);
    expect(res.status).toBe(200);
    expect(stored()).toHaveLength(0);
    expect(state.mediaRows.size).toBe(0);
    const log = state.logs.find((l) => l.action === 'MEDIA_DELETED');
    expect(log.details).toMatchObject({ assetId: asset.id, storageKey: asset.storageKey, filename: asset.filename });
  });

  it('succeeds when the object is already missing (idempotent)', async () => {
    const asset = await seed();
    fs.unlinkSync(path.join(process.env.STORAGE_PATH!, asset.storageKey));
    expect((await del(asset.id)).status).toBe(200);
    expect(state.mediaRows.size).toBe(0);
  });

  it('keeps the row and returns 502 when storage deletion fails', async () => {
    const asset = await seed();
    state.mediaRows.get(asset.id).storageKey = '../escape.png'; // invalid key -> storage refuses
    const res = await del(asset.id);
    expect(res.status).toBe(502);
    expect(state.mediaRows.size).toBe(1);
  });

  it('409 and nothing deleted when the asset is in use', async () => {
    const asset = await seed();
    state.usages = [{ kind: 'product', id: 'p1' }];
    expect((await del(asset.id)).status).toBe(409);
    expect(stored()).toHaveLength(1);
    expect(state.mediaRows.size).toBe(1);
  });
});
