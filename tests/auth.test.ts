import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

const state = vi.hoisted(() => ({
  session: null as any,
  users: new Map<string, any>(),
  dbDown: false,
  attempts: [] as any[],
}));

vi.mock('next-auth', () => ({ getServerSession: async () => state.session }));
vi.mock('@next-auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }));
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: async ({ where, select }: any) => {
        if (state.dbDown) throw new Error('db down');
        const u = where.id
          ? [...state.users.values()].find((x) => x.id === where.id)
          : state.users.get(where.email);
        if (!u) return null;
        if (select) return Object.fromEntries(Object.keys(select).map((k) => [k, u[k]]));
        return u;
      },
    },
    loginAttempt: {
      count: async ({ where }: any) => {
        if (state.dbDown) throw new Error('db down');
        return state.attempts.filter(
          (r) =>
            (where.emailKey === undefined || r.emailKey === where.emailKey) &&
            (where.ipKey === undefined || r.ipKey === where.ipKey) &&
            r.success === where.success,
        ).length;
      },
      create: async ({ data }: any) => {
        if (state.dbDown) throw new Error('db down');
        state.attempts.push({ ...data, createdAt: new Date() });
      },
      deleteMany: async () => ({ count: 0 }),
    },
  },
}));

import { requireAdminSession, authorizeCredentials } from '@/lib/auth';
import { guardAdmin, isSameOriginRequest } from '@/lib/adminApi';

const sessionFor = (id: string, role = 'ADMIN') => ({ user: { id, email: 'a@x.com', role } });

beforeEach(() => {
  state.session = null;
  state.users.clear();
  state.attempts = [];
  state.dbDown = false;
});

describe('requireAdminSession / guardAdmin (DB-backed role recheck)', () => {
  it('401 when there is no session', async () => {
    const g = await guardAdmin();
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.response.status).toBe(401);
  });

  it('allows an admin that exists in the DB', async () => {
    state.users.set('a@x.com', { id: 'u1', email: 'a@x.com', role: 'SUPER_ADMIN' });
    state.session = sessionFor('u1', 'ADMIN');
    const r = await requireAdminSession();
    expect(r.authorized).toBe(true);
    if (r.authorized) expect(r.role).toBe('SUPER_ADMIN'); // DB role wins over the JWT claim
  });

  it('deleted user with a still-valid admin JWT is rejected (401)', async () => {
    state.session = sessionFor('ghost', 'ADMIN');
    const g = await guardAdmin();
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.response.status).toBe(401);
  });

  it('demoted user with a still-valid admin JWT is rejected (403)', async () => {
    state.users.set('a@x.com', { id: 'u1', email: 'a@x.com', role: 'CUSTOMER' });
    state.session = sessionFor('u1', 'ADMIN');
    const g = await guardAdmin();
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.response.status).toBe(403);
  });

  it('re-reads the DB on every call (no caching)', async () => {
    state.users.set('a@x.com', { id: 'u1', email: 'a@x.com', role: 'ADMIN' });
    state.session = sessionFor('u1');
    expect((await requireAdminSession()).authorized).toBe(true);
    state.users.get('a@x.com').role = 'CUSTOMER';
    expect((await requireAdminSession()).authorized).toBe(false);
    state.users.delete('a@x.com');
    expect((await requireAdminSession()).authorized).toBe(false);
  });

  it('fails closed when the DB is down', async () => {
    state.session = sessionFor('u1');
    state.dbDown = true;
    expect((await requireAdminSession()).authorized).toBe(false);
  });

  it('a CUSTOMER session is 403', async () => {
    state.users.set('c@x.com', { id: 'c1', email: 'c@x.com', role: 'CUSTOMER' });
    state.session = sessionFor('c1', 'CUSTOMER');
    const g = await guardAdmin();
    if (!g.ok) expect(g.response.status).toBe(403);
    else throw new Error('expected rejection');
  });
});

describe('same-origin check', () => {
  const host = 'studio.daxul.com';
  it('allows missing Origin and matching hosts', () => {
    expect(isSameOriginRequest({ origin: null, host })).toBe(true);
    expect(isSameOriginRequest({ origin: 'https://studio.daxul.com', host })).toBe(true);
    expect(isSameOriginRequest({ origin: 'https://studio.daxul.com', host: 'internal:3000', forwardedHost: host })).toBe(true);
    expect(isSameOriginRequest({ origin: 'https://studio.daxul.com', host: 'internal:3000', nextauthUrl: 'https://studio.daxul.com' })).toBe(true);
  });
  it('rejects foreign, null and malformed origins', () => {
    expect(isSameOriginRequest({ origin: 'https://evil.com', host })).toBe(false);
    expect(isSameOriginRequest({ origin: 'https://studio.daxul.com.evil.com', host })).toBe(false);
    expect(isSameOriginRequest({ origin: 'null', host })).toBe(false);
    expect(isSameOriginRequest({ origin: 'not a url', host })).toBe(false);
  });
  it('guardAdmin(req) rejects cross-origin mutations with 403 but ignores GET', async () => {
    const mk = (method: string, origin: string) =>
      new Request('https://studio.daxul.com/api/admin/x', { method, headers: { origin, host: 'studio.daxul.com' } });
    const bad = await guardAdmin(mk('POST', 'https://evil.com'));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.response.status).toBe(403);
    const get = await guardAdmin(mk('GET', 'https://evil.com'));
    if (!get.ok) expect(get.response.status).toBe(401); // passes origin check, fails on no session
  });
});

describe('authorizeCredentials', () => {
  const hash = bcrypt.hashSync('correct-horse', 4);
  const req = (ip: string) => ({ headers: { 'x-forwarded-for': ip } });
  beforeEach(() => state.users.set('a@x.com', { id: 'u1', email: 'a@x.com', name: 'A', role: 'ADMIN', passwordHash: hash }));

  it('logs in with correct password (email normalised) and records success', async () => {
    const u = await authorizeCredentials({ email: '  A@X.com ', password: 'correct-horse' }, req('1.1.1.1'));
    expect(u).toMatchObject({ id: 'u1', role: 'ADMIN' });
    expect(state.attempts.some((a) => a.success && a.ipKey === '1.1.1.1' && a.emailKey === 'a@x.com')).toBe(true);
  });

  it('same generic error for wrong password and unknown user', async () => {
    const e1 = await authorizeCredentials({ email: 'a@x.com', password: 'nope' }, req('1.1.1.1')).catch((e) => e.message);
    const e2 = await authorizeCredentials({ email: 'nobody@x.com', password: 'nope' }, req('1.1.1.1')).catch((e) => e.message);
    expect(e1).toBe('Invalid email or password.');
    expect(e2).toBe('Invalid email or password.');
    expect(state.attempts.filter((a) => !a.success)).toHaveLength(2); // unknown users are throttled too
  });

  it('locks the pair after 5 failures but the admin on another IP still gets in', async () => {
    for (let i = 0; i < 5; i++) await authorizeCredentials({ email: 'a@x.com', password: 'bad' }, req('6.6.6.6')).catch(() => {});
    const blocked = await authorizeCredentials({ email: 'a@x.com', password: 'correct-horse' }, req('6.6.6.6')).catch((e) => e.message);
    expect(blocked).toMatch(/Too many login attempts/);
    const ok = await authorizeCredentials({ email: 'a@x.com', password: 'correct-horse' }, req('9.9.9.9'));
    expect(ok).toMatchObject({ id: 'u1' });
  });

  it('fails closed (denies) when the DB is down, even with the right password', async () => {
    state.dbDown = true;
    const msg = await authorizeCredentials({ email: 'a@x.com', password: 'correct-horse' }, req('1.1.1.1')).catch((e) => e.message);
    expect(msg).toBe('Invalid email or password.');
  });
});
