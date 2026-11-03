/**
 * Private, temporary on-disk/memory storage for ephemeral AR models.
 * Stored outside of the public directory so files cannot be directly traversed or accessed
 * without passing through the authenticated session endpoint.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AR_SESSION_TTL_MS } from './lithophaneAr';

const AR_CACHE_DIR = path.join(process.cwd(), '.private_ar_cache');

function ensureCacheDir(): string {
  if (!fs.existsSync(AR_CACHE_DIR)) {
    fs.mkdirSync(AR_CACHE_DIR, { recursive: true });
  }
  return AR_CACHE_DIR;
}

export function saveArModel(tokenHash: string, data: Buffer | ArrayBuffer): string {
  if (!tokenHash || !/^[a-f0-9]{32,128}$/i.test(tokenHash)) {
    throw new Error('Invalid token hash format for AR model storage');
  }
  const dir = ensureCacheDir();
  const filePath = path.join(dir, `${tokenHash.toLowerCase()}.glb`);
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
  fs.writeFileSync(filePath, buf);
  return filePath;
}

export function getArModel(tokenHash: string): Buffer | null {
  if (!tokenHash || !/^[a-f0-9]{32,128}$/i.test(tokenHash)) {
    return null;
  }
  const dir = ensureCacheDir();
  const filePath = path.join(dir, `${tokenHash.toLowerCase()}.glb`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function cleanupExpiredArModels(): number {
  const dir = ensureCacheDir();
  const now = Date.now();
  let deleted = 0;
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (now - stat.mtimeMs > AR_SESSION_TTL_MS) {
        fs.unlinkSync(full);
        deleted++;
      }
    }
  } catch {
    // Non-blocking cleanup
  }
  return deleted;
}
