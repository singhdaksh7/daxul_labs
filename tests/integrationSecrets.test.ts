import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {}, default: {} }));

import { decryptSecret, encryptSecret, maskSecret } from '@/lib/integrationSecrets';
import { rowsToOverrides } from '@/lib/shiprocket/settings';
import { verifyWebhookToken } from '@/lib/shiprocket/webhook';

const OLD = { a: process.env.NEXTAUTH_SECRET, b: process.env.INTEGRATION_ENCRYPTION_KEY };
beforeEach(() => {
  delete process.env.INTEGRATION_ENCRYPTION_KEY;
  process.env.NEXTAUTH_SECRET = 'unit-test-secret-one';
});
afterEach(() => {
  if (OLD.a === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = OLD.a;
  if (OLD.b === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY; else process.env.INTEGRATION_ENCRYPTION_KEY = OLD.b;
});

describe('integrationSecrets', () => {
  it('round-trips and never stores plaintext', () => {
    const enc = encryptSecret('hunter2-password');
    expect(enc.startsWith('v1:')).toBe(true);
    expect(enc).not.toContain('hunter2');
    expect(decryptSecret(enc)).toBe('hunter2-password');
  });
  it('uses a fresh IV per encryption', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });
  it('detects tampering (ciphertext, tag) and malformed payloads', () => {
    const [v, iv, tag, ct] = encryptSecret('secret-value').split(':');
    const flip = (b64: string) => {
      const buf = Buffer.from(b64, 'base64');
      buf[0] ^= 0xff;
      return buf.toString('base64');
    };
    expect(decryptSecret([v, iv, tag, flip(ct)].join(':'))).toBeNull();
    expect(decryptSecret([v, iv, flip(tag), ct].join(':'))).toBeNull();
    expect(decryptSecret('garbage')).toBeNull();
    expect(decryptSecret('')).toBeNull();
    expect(decryptSecret(null)).toBeNull();
  });
  it('cannot be decrypted with a different key', () => {
    const enc = encryptSecret('secret-value');
    process.env.NEXTAUTH_SECRET = 'a-different-secret';
    expect(decryptSecret(enc)).toBeNull();
  });
  it('INTEGRATION_ENCRYPTION_KEY takes precedence over NEXTAUTH_SECRET', () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = 'dedicated-key';
    const enc = encryptSecret('x1');
    process.env.NEXTAUTH_SECRET = 'rotated';
    expect(decryptSecret(enc)).toBe('x1');
  });
  it('masks secrets: tail only for long values, nothing for short ones', () => {
    expect(maskSecret('abcdefghijkl3f2a')).toBe('••••••••3f2a');
    expect(maskSecret('short')).toBe('••••••••');
    expect(maskSecret('abcdefghijkl3f2a')).not.toContain('abcdefgh');
    expect(maskSecret(null)).toBe('');
    expect(maskSecret('')).toBe('');
  });
});

describe('shiprocket settings rowsToOverrides', () => {
  it('decrypts secret rows, reads plain rows, parses numbers/booleans', () => {
    const o = rowsToOverrides([
      { key: 'shiprocket.email', value: ' ops@example.com ', valueEncrypted: null },
      { key: 'shiprocket.password', value: null, valueEncrypted: encryptSecret('pw-123456') },
      { key: 'shiprocket.webhookToken', value: null, valueEncrypted: encryptSecret('tok-abc') },
      { key: 'shiprocket.defaultWeightGrams', value: '750', valueEncrypted: null },
      { key: 'shiprocket.lengthCm', value: '-3', valueEncrypted: null },
      { key: 'shiprocket.heightCm', value: 'abc', valueEncrypted: null },
      { key: 'shiprocket.enabled', value: 'false', valueEncrypted: null },
    ]);
    expect(o.email).toBe('ops@example.com');
    expect(o.password).toBe('pw-123456');
    expect(o.webhookToken).toBe('tok-abc');
    expect(o.defaultWeightGrams).toBe(750);
    expect(o.lengthCm).toBeUndefined();
    expect(o.heightCm).toBeUndefined();
    expect(o.enabled).toBe(false);
  });
  it('treats missing rows as unset, and does not read a secret from the plain column', () => {
    const o = rowsToOverrides([{ key: 'shiprocket.password', value: 'plain-leak', valueEncrypted: null }]);
    expect(o.password).toBeUndefined();
    expect(o.email).toBeUndefined();
    expect(o.enabled).toBeUndefined();
  });
  it('an undecryptable secret (rotated key) falls back to unset rather than throwing', () => {
    const enc = encryptSecret('pw');
    process.env.NEXTAUTH_SECRET = 'rotated';
    expect(rowsToOverrides([{ key: 'shiprocket.password', value: null, valueEncrypted: enc }]).password).toBeUndefined();
  });
});

describe('verifyWebhookToken', () => {
  it('accepts only an exact match and fails closed when unset', () => {
    expect(verifyWebhookToken('abc', 'abc')).toBe(true);
    expect(verifyWebhookToken('abd', 'abc')).toBe(false);
    expect(verifyWebhookToken('abc', 'abcd')).toBe(false);
    expect(verifyWebhookToken(null, 'abc')).toBe(false);
    expect(verifyWebhookToken('abc', null)).toBe(false);
    expect(verifyWebhookToken('', '')).toBe(false);
  });
});
