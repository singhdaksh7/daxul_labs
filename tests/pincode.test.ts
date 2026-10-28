import { describe, it, expect } from 'vitest';
import { checkPincode } from '@/lib/pincode';

describe('Indian Pincode Checker (lib/pincode.ts)', () => {
  it('identifies Delhi NCR metro pincodes correctly', () => {
    const res = checkPincode('110001');
    expect(res.valid).toBe(true);
    expect(res.serviceable).toBe(true);
    expect(res.state).toBe('Delhi NCR');
    expect(res.tier).toBe('metro');
    expect(res.codAvailable).toBe(true);
    expect(res.prepaidAvailable).toBe(true);
    expect(res.estimatedTransitDaysMin).toBe(2);
    expect(res.estimatedTransitDaysMax).toBe(3);
  });

  it('identifies Mumbai metro pincodes correctly', () => {
    const res = checkPincode('400001');
    expect(res.valid).toBe(true);
    expect(res.serviceable).toBe(true);
    expect(res.state).toBe('Maharashtra');
    expect(res.tier).toBe('metro');
    expect(res.estimatedTransitDaysMin).toBe(2);
    expect(res.estimatedTransitDaysMax).toBe(3);
  });

  it('identifies Bangalore metro pincodes correctly', () => {
    const res = checkPincode('560001');
    expect(res.valid).toBe(true);
    expect(res.state).toBe('Karnataka');
    expect(res.tier).toBe('metro');
    expect(res.estimatedTransitDaysMin).toBe(2);
    expect(res.estimatedTransitDaysMax).toBe(3);
  });

  it('identifies Tier-1/Tier-2 city pincodes and adds appropriate transit buffer', () => {
    // 302001 -> Jaipur, Rajasthan
    const res = checkPincode('302001');
    expect(res.valid).toBe(true);
    expect(res.serviceable).toBe(true);
    expect(res.state).toBe('Rajasthan');
    expect(res.tier).toBe('tier1');
    expect(res.estimatedTransitDaysMin).toBe(3);
    expect(res.estimatedTransitDaysMax).toBe(5);
  });

  it('rejects invalid or non-6-digit PIN codes safely', () => {
    expect(checkPincode('000000').valid).toBe(false);
    expect(checkPincode('12345').valid).toBe(false);
    expect(checkPincode('abc123').valid).toBe(false);
    expect(checkPincode('').valid).toBe(false);
  });

  it('calculates combined manufacturing + transit delivery estimates accurately', () => {
    const res = checkPincode('110001', 3); // 3 days print time
    expect(res.valid).toBe(true);
    expect(res.estimatedDispatchDays).toBe(3);
    expect(res.estimatedDeliveryText).toContain('Estimated delivery by');
  });
});
