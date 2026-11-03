/**
 * Private, temporary on-disk/memory storage for ephemeral AR models.
 * Stored outside of the public directory so files cannot be directly traversed or accessed
 * without passing through the authenticated session endpoint.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AR_SESSION_TTL_MS } from './lithophaneAr';

// Ephemeral in-memory fallback cache
export const memoryModelCache = new Map<string, { buffer: Buffer; mtime: number }>();

let resolvedCacheDir: string | null = null;

function ensureCacheDir(): string | null {
  if (resolvedCacheDir) return resolvedCacheDir;
  const candidates = [
    process.env.AR_CACHE_DIR,
    process.env.STORAGE_PATH ? path.join(process.env.STORAGE_PATH, '.private_ar_cache') : null,
    path.join(process.cwd(), '.private_ar_cache'),
    path.join(os.tmpdir(), 'daxul_private_ar_cache'),
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const testFile = path.join(dir, `.write_test_${Date.now()}`);
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      resolvedCacheDir = dir;
      return dir;
    } catch {
      // try next candidate
    }
  }
  return null;
}

export function saveArModel(tokenHash: string, data: Buffer | ArrayBuffer): string {
  if (!tokenHash || !/^[a-f0-9]{32,128}$/i.test(tokenHash)) {
    throw new Error('Invalid token hash format for AR model storage');
  }
  const key = tokenHash.toLowerCase();
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

  // Always keep in memory store as fast fallback
  memoryModelCache.set(key, { buffer: buf, mtime: Date.now() });

  const dir = ensureCacheDir();
  if (dir) {
    try {
      const filePath = path.join(dir, `${key}.glb`);
      fs.writeFileSync(filePath, buf);
      return filePath;
    } catch {
      // Fallback cleanly to in-memory store
    }
  }
  return `memory://${key}`;
}

export function getArModel(tokenHash: string): Buffer | null {
  if (!tokenHash || !/^[a-f0-9]{32,128}$/i.test(tokenHash)) {
    return null;
  }
  const key = tokenHash.toLowerCase();

  // Try on-disk cache first
  const dir = ensureCacheDir();
  if (dir) {
    try {
      const filePath = path.join(dir, `${key}.glb`);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
    } catch {
      // ignore
    }
  }

  // Fallback to in-memory store
  const cached = memoryModelCache.get(key);
  if (cached) {
    if (Date.now() - cached.mtime > AR_SESSION_TTL_MS) {
      memoryModelCache.delete(key);
      return null;
    }
    return cached.buffer;
  }

  return null;
}

export function cleanupExpiredArModels(): number {
  const now = Date.now();
  let deleted = 0;

  // Cleanup in-memory cache
  for (const [key, item] of memoryModelCache.entries()) {
    if (now - item.mtime > AR_SESSION_TTL_MS) {
      memoryModelCache.delete(key);
      deleted++;
    }
  }

  // Cleanup on-disk files
  const dir = ensureCacheDir();
  if (dir) {
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
  }

  return deleted;
}
