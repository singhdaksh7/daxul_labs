import { describe, it, expect, beforeEach } from 'vitest';
import { convertMaterialUnit } from '@/lib/operations/materials';
import { hasPermission } from '@/lib/operations/rbac';
import { generateTotpSecret, generateTotpCode, verifyTotpCode } from '@/lib/operations/twoFactor';
import { MaterialUnit } from '@prisma/client';

describe('Phase D: Operations & Manufacturing Logic', () => {
  describe('Unit Conversions', () => {
    it('converts KG to GRAM correctly', () => {
      expect(convertMaterialUnit(1.5, MaterialUnit.KG, MaterialUnit.GRAM)).toBe(1500);
    });

    it('converts GRAM to KG correctly', () => {
      expect(convertMaterialUnit(2500, MaterialUnit.GRAM, MaterialUnit.KG)).toBe(2.5);
    });

    it('converts BOX to PIECE correctly', () => {
      expect(convertMaterialUnit(2, MaterialUnit.BOX, MaterialUnit.PIECE)).toBe(200);
    });

    it('handles identical units without mutation', () => {
      expect(convertMaterialUnit(42, MaterialUnit.PIECE, MaterialUnit.PIECE)).toBe(42);
    });
  });

  describe('Staff RBAC & Permissions Matrix', () => {
    it('grants SUPER_ADMIN unrestricted access to all permissions', () => {
      const superAdminUser = { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' };
      expect(hasPermission(superAdminUser, 'security.manage')).toBe(true);
      expect(hasPermission(superAdminUser, 'refunds.issue')).toBe(true);
      expect(hasPermission(superAdminUser, 'production.run')).toBe(true);
    });

    it('enforces PRODUCTION role boundary strictly', () => {
      const prodUser = { role: 'ADMIN', staffRole: 'PRODUCTION' };
      expect(hasPermission(prodUser, 'production.run')).toBe(true);
      expect(hasPermission(prodUser, 'materials.write')).toBe(true);
      // Production cannot issue refunds or manage security
      expect(hasPermission(prodUser, 'refunds.issue')).toBe(false);
      expect(hasPermission(prodUser, 'security.manage')).toBe(false);
    });

    it('enforces QC role boundary strictly', () => {
      const qcUser = { role: 'ADMIN', staffRole: 'QC' };
      expect(hasPermission(qcUser, 'qc.perform')).toBe(true);
      expect(hasPermission(qcUser, 'products.write')).toBe(false);
      expect(hasPermission(qcUser, 'refunds.issue')).toBe(false);
    });

    it('enforces ANALYTICS role read-only boundary', () => {
      const analyst = { role: 'ADMIN', staffRole: 'ANALYTICS' };
      expect(hasPermission(analyst, 'analytics.view')).toBe(true);
      expect(hasPermission(analyst, 'products.read')).toBe(true);
      expect(hasPermission(analyst, 'products.write')).toBe(false);
      expect(hasPermission(analyst, 'production.run')).toBe(false);
    });
  });

  describe('Admin 2FA & TOTP Engine', () => {
    it('generates valid base32 secret and 6-digit codes', () => {
      const secret = generateTotpSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThanOrEqual(16);

      const code = generateTotpCode(secret);
      expect(code).toMatch(/^\d{6}$/);

      const isValid = verifyTotpCode(secret, code);
      expect(isValid).toBe(true);
    });

    it('rejects invalid or tampered TOTP codes', () => {
      const secret = generateTotpSecret();
      const invalidCode = '000000';
      const realCode = generateTotpCode(secret);
      if (realCode !== invalidCode) {
        expect(verifyTotpCode(secret, invalidCode)).toBe(false);
      }
    });
  });
});

