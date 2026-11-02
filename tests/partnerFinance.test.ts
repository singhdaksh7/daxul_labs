import { describe, it, expect } from 'vitest';
import { rupeesToPaise, paiseToRupees, splitPaiseDeterministically } from '@/lib/finance/money';

describe('Partner Finance & Money Arithmetic', () => {
  describe('Paise Conversion Invariants', () => {
    it('converts Rupees to integer paise without floating point error', () => {
      expect(rupeesToPaise(1499.5)).toBe(BigInt(149950));
      expect(rupeesToPaise(30000)).toBe(BigInt(3000000));
      expect(rupeesToPaise(0.01)).toBe(BigInt(1));
    });

    it('converts paise to Rupees correctly', () => {
      expect(paiseToRupees(BigInt(149950))).toBe(1499.5);
      expect(paiseToRupees(BigInt(100))).toBe(1.0);
    });
  });

  describe('Deterministic 3-Way Paise Splitting', () => {
    it('splits ₹30,000 exactly equally with 0 remainder', () => {
      const partners = [
        { id: 'daksh', splitPercentage: 33.333334 },
        { id: 'partnerB', splitPercentage: 33.333333 },
        { id: 'partnerC', splitPercentage: 33.333333 },
      ];

      const totalPaise = rupeesToPaise(30000); // 3,000,000 paise
      const shares = splitPaiseDeterministically(totalPaise, partners);

      expect(shares).toHaveLength(3);
      expect(shares[0].amountPaise).toBe(BigInt(1000000));
      expect(shares[1].amountPaise).toBe(BigInt(1000000));
      expect(shares[2].amountPaise).toBe(BigInt(1000000));

      const sum = shares.reduce((acc, s) => acc + s.amountPaise, BigInt(0));
      expect(sum).toBe(totalPaise);
    });

    it('allocates indivisible remainder paise deterministically without leaking money (e.g. ₹100 / 3)', () => {
      const partners = [
        { id: 'daksh', splitPercentage: 33.333334 },
        { id: 'partnerB', splitPercentage: 33.333333 },
        { id: 'partnerC', splitPercentage: 33.333333 },
      ];

      const totalPaise = rupeesToPaise(100); // 10,000 paise
      const shares = splitPaiseDeterministically(totalPaise, partners);

      expect(shares).toHaveLength(3);
      // 10000 / 3 = 3333 with remainder 1 assigned to first partner
      expect(shares[0].amountPaise).toBe(BigInt(3334));
      expect(shares[1].amountPaise).toBe(BigInt(3333));
      expect(shares[2].amountPaise).toBe(BigInt(3333));

      // Invariant: Exact conservation of paise
      const sum = shares.reduce((acc, s) => acc + s.amountPaise, BigInt(0));
      expect(sum).toBe(totalPaise);
    });

    it('handles ₹10,000 monthly EMI indivisible split exactly', () => {
      const partners = [
        { id: 'daksh', splitPercentage: 33.333334 },
        { id: 'partnerB', splitPercentage: 33.333333 },
        { id: 'partnerC', splitPercentage: 33.333333 },
      ];

      const totalPaise = rupeesToPaise(10000); // 1,000,000 paise
      const shares = splitPaiseDeterministically(totalPaise, partners);

      // 1,000,000 / 3 = 333,333.33...
      // Partner 1 = 333,334 paise (₹3,333.34)
      // Partner 2 = 333,333 paise (₹3,333.33)
      // Partner 3 = 333,333 paise (₹3,333.33)
      expect(shares[0].amountPaise).toBe(BigInt(333334));
      expect(shares[1].amountPaise).toBe(BigInt(333333));
      expect(shares[2].amountPaise).toBe(BigInt(333333));

      const sum = shares.reduce((acc, s) => acc + s.amountPaise, BigInt(0));
      expect(sum).toBe(totalPaise);
    });
  });
});

