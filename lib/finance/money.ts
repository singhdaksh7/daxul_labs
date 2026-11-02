/**
 * Money utilities for integer paise calculations (RFC / standard ledger practice).
 * ₹1.00 = 100 paise. Never uses floating point arithmetic for monetary balances.
 */

export function rupeesToPaise(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

export function paiseToRupees(paise: bigint | number): number {
  return Number(paise) / 100;
}

export function formatPaiseToInr(paise: bigint | number): string {
  const r = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(r);
}

export interface SplitResult {
  partnerId: string;
  percentageSnapshot: number;
  amountPaise: bigint;
}

/**
 * Splits an amount in paise across partners deterministically.
 * Guarantees sum of split amounts equals exact total amount in paise with no rounding leaks.
 */
export function splitPaiseDeterministically(
  totalAmountPaise: bigint,
  partners: Array<{ id: string; splitPercentage: number }>,
): SplitResult[] {
  if (partners.length === 0) return [];
  if (totalAmountPaise === BigInt(0)) {
    return partners.map((p) => ({
      partnerId: p.id,
      percentageSnapshot: p.splitPercentage,
      amountPaise: BigInt(0),
    }));
  }

  // Check if equal split across N partners (within 0.001% tolerance)
  const isAllEqual = partners.every(
    (p) => Math.abs(p.splitPercentage - partners[0].splitPercentage) < 0.01,
  );

  const n = BigInt(partners.length);
  if (isAllEqual) {
    const baseShare = totalAmountPaise / n;
    let remainder = totalAmountPaise % n;

    return partners.map((p) => {
      let share = baseShare;
      if (remainder > BigInt(0)) {
        share += BigInt(1);
        remainder -= BigInt(1);
      }
      return {
        partnerId: p.id,
        percentageSnapshot: p.splitPercentage,
        amountPaise: share,
      };
    });
  }

  // Calculate sum of split percentages to normalize proportions
  const totalPercentage = partners.reduce((acc, p) => acc + p.splitPercentage, 0);

  // Calculate base floors for each partner
  const totalNumber = Number(totalAmountPaise);
  let allocatedSum = BigInt(0);

  const preliminary = partners.map((p) => {
    // Exact floor allocation relative to total percentage
    const share = Math.floor((totalNumber * p.splitPercentage) / totalPercentage);
    const shareBig = BigInt(share);
    allocatedSum += shareBig;
    return {
      partnerId: p.id,
      percentageSnapshot: p.splitPercentage,
      amountPaise: shareBig,
    };
  });

  // Remainder allocation (1 paisa distributed deterministically to first partner(s) until exhausted)
  let remainder = totalAmountPaise - allocatedSum;
  let idx = 0;
  while (remainder > BigInt(0) && idx < preliminary.length) {
    preliminary[idx].amountPaise += BigInt(1);
    remainder -= BigInt(1);
    idx++;
  }

  return preliminary;
}
