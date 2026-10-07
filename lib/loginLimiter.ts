import { prisma } from './db';

/**
 * PostgreSQL-backed login throttling (LoginAttempt table). Shared across containers, survives restarts.
 *
 * Dimensions (failures within WINDOW_MS):
 *  - pair  (emailKey + ipKey): PAIR_LIMIT  -> hard block. An attacker's failures from IP A never block the
 *                                             real admin on IP B at this level.
 *  - ip    (ipKey):            IP_LIMIT    -> hard block (one source hammering many accounts).
 *  - email (emailKey, any IP): EMAIL_SOFT_LIMIT -> NEVER blocks, only adds a delay, so a distributed
 *                                             attacker cannot permanently lock out the real admin.
 *
 * Fail closed: any DB error propagates; the caller (authorize) must deny the login.
 * The check/record sequence is not atomic, so a burst of parallel guesses can slightly exceed the limits.
 */
export const WINDOW_MS = 15 * 60 * 1000;
export const PAIR_LIMIT = 5;
export const IP_LIMIT = 30;
export const EMAIL_SOFT_LIMIT = 50;
export const SOFT_DELAY_MS = 2000;
const RETENTION_MS = 24 * 60 * 60 * 1000;

export type LimitDecision =
  | { allowed: true; delayMs: number }
  | { allowed: false; reason: 'pair' | 'ip' };

export function normalizeEmail(email: string): string {
  return String(email ?? '').toLowerCase().trim().slice(0, 254);
}

/** Client IP from Traefik's x-forwarded-for first hop (falls back to x-real-ip, then "unknown"). */
export function clientIpFromHeaders(headers: unknown): string {
  const get = (name: string): string | undefined => {
    if (!headers) return undefined;
    const h = headers as { get?: (n: string) => string | null } & Record<string, unknown>;
    if (typeof h.get === 'function') return h.get(name) ?? undefined;
    const v = h[name] ?? h[name.toLowerCase()];
    if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : undefined;
    return typeof v === 'string' ? v : undefined;
  };
  const candidates = [get('x-forwarded-for')?.split(',')[0], get('x-real-ip')];
  for (const c of candidates) {
    const ip = c?.trim();
    // Loose IPv4/IPv6 shape check; refuses arbitrary junk used to dodge or pollute keys.
    if (ip && ip.length <= 45 && /^[0-9a-fA-F:.]+$/.test(ip)) return ip.toLowerCase();
  }
  return 'unknown';
}

const since = () => new Date(Date.now() - WINDOW_MS);

export async function checkLoginAllowed(emailKey: string, ipKey: string): Promise<LimitDecision> {
  const windowStart = since();
  const [pair, ip, email] = await Promise.all([
    prisma.loginAttempt.count({ where: { emailKey, ipKey, success: false, createdAt: { gte: windowStart } } }),
    prisma.loginAttempt.count({ where: { ipKey, success: false, createdAt: { gte: windowStart } } }),
    prisma.loginAttempt.count({ where: { emailKey, success: false, createdAt: { gte: windowStart } } }),
  ]);
  if (pair >= PAIR_LIMIT) return { allowed: false, reason: 'pair' };
  if (ip >= IP_LIMIT) return { allowed: false, reason: 'ip' };
  return { allowed: true, delayMs: email >= EMAIL_SOFT_LIMIT ? SOFT_DELAY_MS : 0 };
}

export async function recordLoginFailure(emailKey: string, ipKey: string): Promise<void> {
  await prisma.loginAttempt.create({ data: { emailKey, ipKey, success: false } });
}

/** Clears the pair's failures and records the success. */
export async function recordLoginSuccess(emailKey: string, ipKey: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { emailKey, ipKey, success: false } });
  await prisma.loginAttempt.create({ data: { emailKey, ipKey, success: true } });
}

let lastCleanup = 0;
/** Opportunistic retention cleanup (rows older than 24h); at most once per hour per process. Never throws. */
export async function cleanupOldAttempts(now = Date.now()): Promise<void> {
  if (now - lastCleanup < 60 * 60 * 1000) return;
  lastCleanup = now;
  try {
    await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(now - RETENTION_MS) } } });
  } catch (err) {
    console.error('loginAttempt cleanup failed', err);
  }
}

/** Test helper. */
export function _resetCleanupClock() {
  lastCleanup = 0;
}
