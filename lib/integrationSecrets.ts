import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM encryption for integration secrets stored in the database.
 * Key = SHA-256(INTEGRATION_ENCRYPTION_KEY || NEXTAUTH_SECRET). If you rotate that secret, previously
 * saved integration secrets cannot be decrypted and must be re-entered (decrypt returns null).
 */
function key(): Buffer {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('No encryption secret configured (NEXTAUTH_SECRET)');
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ct.toString('base64')].join(':');
}

export function decryptSecret(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const [v, iv, tag, ct] = payload.split(':');
    if (v !== 'v1' || !iv || !tag || !ct) return null;
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Shows only the tail of a secret, e.g. "••••••3f2a". Never reveals short secrets. */
export function maskSecret(plain: string | null | undefined): string {
  if (!plain) return '';
  return plain.length <= 8 ? '••••••••' : `••••••••${plain.slice(-4)}`;
}
