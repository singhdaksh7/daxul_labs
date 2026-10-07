import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = { emailKey: string; ipKey: string; success: boolean; createdAt: Date };
let rows: Row[] = [];
let failNext = false;

function matches(r: Row, w: any): boolean {
  if (w.emailKey !== undefined && r.emailKey !== w.emailKey) return false;
  if (w.ipKey !== undefined && r.ipKey !== w.ipKey) return false;
  if (w.success !== undefined && r.success !== w.success) return false;
  if (w.createdAt?.gte && !(r.createdAt >= w.createdAt.gte)) return false;
  if (w.createdAt?.lt && !(r.createdAt < w.createdAt.lt)) return false;
  return true;
}

vi.mock('@/lib/db', () => ({
  prisma: {
    loginAttempt: {
      count: async ({ where }: any) => {
        if (failNext) throw new Error('db down');
        return rows.filter((r) => matches(r, where)).length;
      },
      create: async ({ data }: any) => {
        if (failNext) throw new Error('db down');
        rows.push({ ...data, createdAt: new Date() });
      },
      deleteMany: async ({ where }: any) => {
        const before = rows.length;
        rows = rows.filter((r) => !matches(r, where));
        return { count: before - rows.length };
      },
    },
  },
}));

import {
  checkLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
  cleanupOldAttempts,
  clientIpFromHeaders,
  normalizeEmail,
  _resetCleanupClock,
  PAIR_LIMIT,
  IP_LIMIT,
  EMAIL_SOFT_LIMIT,
} from '@/lib/loginLimiter';

beforeEach(() => {
  rows = [];
  failNext = false;
  _resetCleanupClock();
});

const fail = async (e: string, ip: string, n = 1) => {
  for (let i = 0; i < n; i++) await recordLoginFailure(e, ip);
};

describe('loginLimiter', () => {
  it('blocks the (email, ip) pair after PAIR_LIMIT failures', async () => {
    await fail('a@x.com', '1.1.1.1', PAIR_LIMIT - 1);
    expect((await checkLoginAllowed('a@x.com', '1.1.1.1')).allowed).toBe(true);
    await fail('a@x.com', '1.1.1.1');
    expect(await checkLoginAllowed('a@x.com', '1.1.1.1')).toEqual({ allowed: false, reason: 'pair' });
  });

  it('attacker failures from IP A do not block the legit admin on IP B', async () => {
    await fail('admin@x.com', '6.6.6.6', 200); // distributed attacker hammering the admin email
    const d = await checkLoginAllowed('admin@x.com', '9.9.9.9');
    expect(d.allowed).toBe(true);
  });

  it('high per-email failure count only slows down, never blocks', async () => {
    for (let i = 0; i < EMAIL_SOFT_LIMIT; i++) await recordLoginFailure('admin@x.com', `10.0.${Math.floor(i / 20)}.${i % 20}`);
    const d = await checkLoginAllowed('admin@x.com', '9.9.9.9');
    expect(d).toMatchObject({ allowed: true });
    expect((d as { delayMs: number }).delayMs).toBeGreaterThan(0);
  });

  it('blocks an IP after IP_LIMIT failures across accounts', async () => {
    for (let i = 0; i < IP_LIMIT; i++) await recordLoginFailure(`u${i}@x.com`, '2.2.2.2');
    expect(await checkLoginAllowed('fresh@x.com', '2.2.2.2')).toEqual({ allowed: false, reason: 'ip' });
    expect((await checkLoginAllowed('fresh@x.com', '3.3.3.3')).allowed).toBe(true);
  });

  it('success clears the pair failures and is recorded', async () => {
    await fail('a@x.com', '1.1.1.1', PAIR_LIMIT - 1);
    await recordLoginSuccess('a@x.com', '1.1.1.1');
    expect(rows.filter((r) => !r.success)).toHaveLength(0);
    expect(rows.filter((r) => r.success)).toHaveLength(1);
    expect((await checkLoginAllowed('a@x.com', '1.1.1.1')).allowed).toBe(true);
  });

  it('failures older than the window do not count', async () => {
    await fail('a@x.com', '1.1.1.1', PAIR_LIMIT);
    rows.forEach((r) => (r.createdAt = new Date(Date.now() - 16 * 60 * 1000)));
    expect((await checkLoginAllowed('a@x.com', '1.1.1.1')).allowed).toBe(true);
  });

  it('cleanup removes rows older than 24h only', async () => {
    rows.push({ emailKey: 'o', ipKey: 'o', success: false, createdAt: new Date(Date.now() - 25 * 3600 * 1000) });
    rows.push({ emailKey: 'n', ipKey: 'n', success: false, createdAt: new Date() });
    await cleanupOldAttempts();
    expect(rows.map((r) => r.emailKey)).toEqual(['n']);
  });

  it('propagates DB errors so callers can fail closed', async () => {
    failNext = true;
    await expect(checkLoginAllowed('a@x.com', '1.1.1.1')).rejects.toThrow('db down');
  });

  it('normalises email and extracts the first x-forwarded-for hop', () => {
    expect(normalizeEmail('  Admin@X.COM ')).toBe('admin@x.com');
    expect(clientIpFromHeaders(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(clientIpFromHeaders({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })).toBe('203.0.113.7');
    expect(clientIpFromHeaders({ 'x-forwarded-for': ['198.51.100.2'] })).toBe('198.51.100.2');
    expect(clientIpFromHeaders({ 'x-forwarded-for': "<script>" })).toBe('unknown');
    expect(clientIpFromHeaders(undefined)).toBe('unknown');
    expect(clientIpFromHeaders(new Headers())).toBe('unknown');
  });
});
