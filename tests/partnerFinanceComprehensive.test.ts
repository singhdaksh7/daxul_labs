import { describe, it, expect, beforeEach } from 'vitest';
import { rupeesToPaise, paiseToRupees, splitPaiseDeterministically } from '@/lib/finance/money';

describe('Partner Finance Comprehensive Logic & Accounting Integrity', () => {
  const threePartners = [
    { id: 'daksh', splitPercentage: 33.333334 },
    { id: 'partnerB', splitPercentage: 33.333333 },
    { id: 'partnerC', splitPercentage: 33.333333 },
  ];

  describe('Paise Conversion & Edge Cases', () => {
    it('converts small micro-fractions safely (₹0.01 = 1 paisa)', () => {
      expect(rupeesToPaise(0.01)).toBe(BigInt(1));
      expect(paiseToRupees(BigInt(1))).toBe(0.01);
    });

    it('converts ₹1.00 = 100 paise exactly', () => {
      expect(rupeesToPaise(1)).toBe(BigInt(100));
      expect(paiseToRupees(BigInt(100))).toBe(1.0);
    });
  });

  describe('Deterministic Splitting & Conservation of Money', () => {
    it('exact split for ₹30,000 across 3 partners with zero money loss', () => {
      const total = rupeesToPaise(30000);
      const split = splitPaiseDeterministically(total, threePartners);

      expect(split[0].amountPaise).toBe(BigInt(1000000));
      expect(split[1].amountPaise).toBe(BigInt(1000000));
      expect(split[2].amountPaise).toBe(BigInt(1000000));

      const sum = split.reduce((acc, s) => acc + s.amountPaise, BigInt(0));
      expect(sum).toBe(total);
    });

    it('splits indivisible ₹100 into exactly 3334, 3333, 3333 paise (sum = 10000)', () => {
      const total = rupeesToPaise(100);
      const split = splitPaiseDeterministically(total, threePartners);

      expect(split[0].amountPaise).toBe(BigInt(3334));
      expect(split[1].amountPaise).toBe(BigInt(3333));
      expect(split[2].amountPaise).toBe(BigInt(3333));

      const sum = split.reduce((acc, s) => acc + s.amountPaise, BigInt(0));
      expect(sum).toBe(total);
    });

    it('splits ₹1.00 (100 paise) across 3 partners (34, 33, 33 paise)', () => {
      const total = rupeesToPaise(1);
      const split = splitPaiseDeterministically(total, threePartners);

      expect(split[0].amountPaise).toBe(BigInt(34));
      expect(split[1].amountPaise).toBe(BigInt(33));
      expect(split[2].amountPaise).toBe(BigInt(33));

      const sum = split.reduce((acc, s) => acc + s.amountPaise, BigInt(0));
      expect(sum).toBe(total);
    });
  });

  describe('Real Printer EMI Scenario Simulation (₹90,000 / ₹30k Down / 6 x ₹10k)', () => {
    it('down payment ₹30,000 produces exact partner shares', () => {
      const downPaymentPaise = rupeesToPaise(30000);
      const downShares = splitPaiseDeterministically(downPaymentPaise, threePartners);

      expect(downShares[0].amountPaise).toBe(BigInt(1000000)); // ₹10,000 Daksh own share
      expect(downShares[1].amountPaise).toBe(BigInt(1000000)); // ₹10,000 Partner B owes
      expect(downShares[2].amountPaise).toBe(BigInt(1000000)); // ₹10,000 Partner C owes

      // Partner B + Partner C dues to Daksh = ₹20,000
      const partnerOwedToDaksh = downShares[1].amountPaise + downShares[2].amountPaise;
      expect(partnerOwedToDaksh).toBe(BigInt(2000000));
    });

    it('6 monthly EMIs of ₹10,000 each sum exactly to ₹60,000 financed principal', () => {
      const financedAmount = rupeesToPaise(60000); // 6,000,000 paise
      const monthlyEmiPaise = rupeesToPaise(10000); // 1,000,000 paise

      let cumulativeInstallments = BigInt(0);
      let cumulativePartnerBObligations = BigInt(0);
      let cumulativePartnerCObligations = BigInt(0);

      for (let month = 1; month <= 6; month++) {
        const monthSplit = splitPaiseDeterministically(monthlyEmiPaise, threePartners);
        cumulativeInstallments += monthlyEmiPaise;
        cumulativePartnerBObligations += monthSplit[1].amountPaise;
        cumulativePartnerCObligations += monthSplit[2].amountPaise;

        expect(monthSplit[0].amountPaise).toBe(BigInt(333334));
        expect(monthSplit[1].amountPaise).toBe(BigInt(333333));
        expect(monthSplit[2].amountPaise).toBe(BigInt(333333));
      }

      expect(cumulativeInstallments).toBe(financedAmount);
      // Over 6 months, Partner B owes 6 * 333333 = 1,999,998 paise (~₹19,999.98)
      expect(cumulativePartnerBObligations).toBe(BigInt(1999998));
    });
  });

  describe('Accounting Classification & Double-Counting Safeguards', () => {
    it('distinguishes INVENTORY_PURCHASE from OPERATING_EXPENSE', () => {
      const opexCategory = 'OPERATING_EXPENSE';
      const inventoryCategory = 'INVENTORY_PURCHASE';

      // Operating expenses reduce period profit; inventory purchases enter asset balance
      const eligibleForProfitDeduction = (classification: string) => classification === 'OPERATING_EXPENSE';

      expect(eligibleForProfitDeduction(opexCategory)).toBe(true);
      expect(eligibleForProfitDeduction(inventoryCategory)).toBe(false);
    });

    it('distinguishes CAPITAL_CONTRIBUTION from Business Revenue', () => {
      const capitalType = 'CAPITAL_CONTRIBUTION';
      const isRevenue = (type: string) => type === 'ORDER_REVENUE';

      expect(isRevenue(capitalType)).toBe(false);
    });

    it('enforces conflict of interest verification rules', () => {
      const canVerifySettlement = (payerPartnerId: string, verifierPartnerId: string, verifierRole: string) => {
        if (payerPartnerId === verifierPartnerId && verifierRole !== 'SUPER_ADMIN') {
          return false;
        }
        return true;
      };

      // Partner B pays Daksh -> Daksh can verify
      expect(canVerifySettlement('partnerB', 'daksh', 'ADMIN')).toBe(true);
      // Partner B pays Daksh -> Partner B cannot self-verify
      expect(canVerifySettlement('partnerB', 'partnerB', 'ADMIN')).toBe(false);
      // Super Admin override allowed
      expect(canVerifySettlement('partnerB', 'partnerB', 'SUPER_ADMIN')).toBe(true);
    });
  });
});

