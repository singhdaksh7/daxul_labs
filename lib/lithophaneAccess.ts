/**
 * Access rule for PRIVATE customer photos (UploadedFile). Pure + unit-tested.
 *  - admins can always read
 *  - the logged-in owner (userId match) can read
 *  - a guest holding the owner cookie whose SHA-256 equals UploadedFile.ownerToken can read
 *  - everyone else: 404 (no existence oracle)
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export const LITHO_OWNER_COOKIE = 'daxul_lp_owner';

export const hashOwnerToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const newOwnerToken = () => randomBytes(24).toString('hex');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export interface UploadOwnership {
  userId: string | null;
  ownerToken: string | null;
}
export interface Caller {
  isAdmin?: boolean;
  userId?: string | null;
  /** raw cookie value (unhashed) */
  ownerCookie?: string | null;
}

export function ownerCanRead(file: UploadOwnership | null | undefined, caller: Caller): boolean {
  if (!file) return false;
  if (caller.isAdmin) return true;
  if (file.userId && caller.userId && file.userId === caller.userId) return true;
  if (file.ownerToken && caller.ownerCookie) {
    const a = Buffer.from(hashOwnerToken(caller.ownerCookie));
    const b = Buffer.from(file.ownerToken);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}
