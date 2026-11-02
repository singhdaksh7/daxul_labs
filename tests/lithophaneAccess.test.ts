import { describe, expect, it } from 'vitest';
import { hashOwnerToken, newOwnerToken, ownerCanRead } from '@/lib/lithophaneAccess';

describe('private photo access rule', () => {
  const token = newOwnerToken();
  const guestFile = { userId: null, ownerToken: hashOwnerToken(token) };
  const userFile = { userId: 'user-1', ownerToken: null };

  it('stores a SHA-256 (hex) of the cookie, never the cookie itself', () => {
    expect(guestFile.ownerToken).toMatch(/^[a-f0-9]{64}$/);
    expect(guestFile.ownerToken).not.toBe(token);
  });
  it('guest owner cookie can read', () => {
    expect(ownerCanRead(guestFile, { ownerCookie: token })).toBe(true);
  });
  it('a different cookie, no cookie, or a forged hash cannot read', () => {
    expect(ownerCanRead(guestFile, { ownerCookie: newOwnerToken() })).toBe(false);
    expect(ownerCanRead(guestFile, {})).toBe(false);
    expect(ownerCanRead(guestFile, { ownerCookie: guestFile.ownerToken })).toBe(false); // presenting the hash is not enough
  });
  it('logged-in owner can read; another user cannot', () => {
    expect(ownerCanRead(userFile, { userId: 'user-1' })).toBe(true);
    expect(ownerCanRead(userFile, { userId: 'user-2' })).toBe(false);
  });
  it('admins can always read', () => {
    expect(ownerCanRead(guestFile, { isAdmin: true })).toBe(true);
    expect(ownerCanRead(userFile, { isAdmin: true })).toBe(true);
  });
  it('everyone else is denied, and unknown files are denied (404 upstream)', () => {
    expect(ownerCanRead(userFile, {})).toBe(false);
    expect(ownerCanRead(null, { isAdmin: true })).toBe(false);
    expect(ownerCanRead({ userId: null, ownerToken: null }, { userId: 'user-1', ownerCookie: token })).toBe(false);
  });
});
