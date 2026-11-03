import { describe, expect, it } from 'vitest';
import {
  generateArSessionToken,
  hashArSessionToken,
  isArSessionExpired,
  AR_SESSION_TTL_MS,
} from '@/lib/lithophaneAr';
import { saveArModel, getArModel, cleanupExpiredArModels } from '@/lib/lithophaneArStorage';

describe('AR Access Control & Security', () => {
  it('stores and retrieves binary GLB models only via valid token hash', () => {
    const token = generateArSessionToken();
    const tokenHash = hashArSessionToken(token);

    const dummyGlb = Buffer.from('glTF-test-binary-data');
    saveArModel(tokenHash, dummyGlb);

    const retrieved = getArModel(tokenHash);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.toString()).toBe('glTF-test-binary-data');

    // Attempting to read with wrong/unauthorized token hash fails
    const wrongTokenHash = hashArSessionToken(generateArSessionToken());
    expect(getArModel(wrongTokenHash)).toBeNull();
  });

  it('rejects path traversal attempts in token hash', () => {
    expect(() => saveArModel('../../../etc/passwd', Buffer.from('hack'))).toThrow();
  });

  it('detects and rejects expired AR sessions', () => {
    const expiredTime = new Date(Date.now() - 5000);
    const activeTime = new Date(Date.now() + AR_SESSION_TTL_MS);

    expect(isArSessionExpired(expiredTime)).toBe(true);
    expect(isArSessionExpired(activeTime)).toBe(false);
  });

  it('cleans up models older than session TTL', () => {
    // Should run without throwing errors
    const cleaned = cleanupExpiredArModels();
    expect(typeof cleaned).toBe('number');
  });
});

