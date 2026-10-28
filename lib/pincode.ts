/**
 * Pure helper for Indian pincode validation and delivery estimation.
 * Safe for client and server.
 */

export interface PincodeResult {
  valid: boolean;
  pincode: string;
  serviceable: boolean;
  region: string;
  state: string;
  tier: 'metro' | 'tier1' | 'tier2' | 'remote';
  estimatedDispatchDays: number;
  estimatedTransitDaysMin: number;
  estimatedTransitDaysMax: number;
  estimatedDeliveryText: string;
  codAvailable: boolean;
  prepaidAvailable: boolean;
}

const METRO_PINCODES = new Set([
  // Delhi NCR
  '11',
  // Mumbai
  '40',
  // Bengaluru
  '56',
  // Chennai
  '60',
  // Hyderabad
  '50',
  // Kolkata
  '70',
  // Pune
  '41',
  // Ahmedabad
  '38',
]);

const REGION_MAP: Record<string, { region: string; state: string }> = {
  '11': { region: 'North', state: 'Delhi NCR' },
  '12': { region: 'North', state: 'Haryana' },
  '13': { region: 'North', state: 'Haryana' },
  '14': { region: 'North', state: 'Punjab' },
  '15': { region: 'North', state: 'Punjab' },
  '16': { region: 'North', state: 'Chandigarh' },
  '17': { region: 'North', state: 'Himachal Pradesh' },
  '18': { region: 'North', state: 'Jammu & Kashmir' },
  '19': { region: 'North', state: 'Jammu & Kashmir' },
  '20': { region: 'North', state: 'Uttar Pradesh' },
  '21': { region: 'North', state: 'Uttar Pradesh' },
  '22': { region: 'North', state: 'Uttar Pradesh' },
  '23': { region: 'North', state: 'Uttar Pradesh' },
  '24': { region: 'North', state: 'Uttarakhand' },
  '25': { region: 'North', state: 'Uttar Pradesh' },
  '26': { region: 'North', state: 'Uttarakhand' },
  '27': { region: 'North', state: 'Uttar Pradesh' },
  '28': { region: 'North', state: 'Uttar Pradesh' },
  '30': { region: 'West', state: 'Rajasthan' },
  '31': { region: 'West', state: 'Rajasthan' },
  '32': { region: 'West', state: 'Rajasthan' },
  '33': { region: 'West', state: 'Rajasthan' },
  '34': { region: 'West', state: 'Rajasthan' },
  '36': { region: 'West', state: 'Gujarat' },
  '37': { region: 'West', state: 'Gujarat' },
  '38': { region: 'West', state: 'Gujarat' },
  '39': { region: 'West', state: 'Gujarat' },
  '40': { region: 'West', state: 'Maharashtra' },
  '41': { region: 'West', state: 'Maharashtra' },
  '42': { region: 'West', state: 'Maharashtra' },
  '43': { region: 'West', state: 'Maharashtra' },
  '44': { region: 'West', state: 'Maharashtra' },
  '45': { region: 'Central', state: 'Madhya Pradesh' },
  '46': { region: 'Central', state: 'Madhya Pradesh' },
  '47': { region: 'Central', state: 'Madhya Pradesh' },
  '48': { region: 'Central', state: 'Madhya Pradesh' },
  '49': { region: 'Central', state: 'Chhattisgarh' },
  '50': { region: 'South', state: 'Telangana' },
  '51': { region: 'South', state: 'Andhra Pradesh' },
  '52': { region: 'South', state: 'Andhra Pradesh' },
  '53': { region: 'South', state: 'Andhra Pradesh' },
  '56': { region: 'South', state: 'Karnataka' },
  '57': { region: 'South', state: 'Karnataka' },
  '58': { region: 'South', state: 'Karnataka' },
  '59': { region: 'South', state: 'Karnataka' },
  '60': { region: 'South', state: 'Tamil Nadu' },
  '61': { region: 'South', state: 'Tamil Nadu' },
  '62': { region: 'South', state: 'Tamil Nadu' },
  '63': { region: 'South', state: 'Tamil Nadu' },
  '64': { region: 'South', state: 'Tamil Nadu' },
  '67': { region: 'South', state: 'Kerala' },
  '68': { region: 'South', state: 'Kerala' },
  '69': { region: 'South', state: 'Kerala' },
  '70': { region: 'East', state: 'West Bengal' },
  '71': { region: 'East', state: 'West Bengal' },
  '72': { region: 'East', state: 'West Bengal' },
  '73': { region: 'East', state: 'West Bengal' },
  '74': { region: 'East', state: 'West Bengal' },
  '75': { region: 'East', state: 'Odisha' },
  '76': { region: 'East', state: 'Odisha' },
  '77': { region: 'East', state: 'Odisha' },
  '78': { region: 'North East', state: 'Assam' },
  '79': { region: 'North East', state: 'NE States' },
  '80': { region: 'East', state: 'Bihar' },
  '81': { region: 'East', state: 'Bihar' },
  '82': { region: 'East', state: 'Jharkhand' },
  '83': { region: 'East', state: 'Jharkhand' },
  '84': { region: 'East', state: 'Bihar' },
  '85': { region: 'East', state: 'Bihar' },
};

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0) {
      // Mon-Sat are business/fabrication days
      added++;
    }
  }
  return result;
}

export function checkPincode(
  pincodeRaw: string,
  productionTimeDays = 2
): PincodeResult {
  const clean = pincodeRaw.replace(/\D/g, '').slice(0, 6);

  if (clean.length !== 6 || !/^[1-9][0-9]{5}$/.test(clean)) {
    return {
      valid: false,
      pincode: clean,
      serviceable: false,
      region: 'Unknown',
      state: 'Unknown',
      tier: 'remote',
      estimatedDispatchDays: 0,
      estimatedTransitDaysMin: 0,
      estimatedTransitDaysMax: 0,
      estimatedDeliveryText: 'Please enter a valid 6-digit Indian PIN code.',
      codAvailable: false,
      prepaidAvailable: false,
    };
  }

  const prefix = clean.slice(0, 2);
  const info = REGION_MAP[prefix] || { region: 'All India', state: 'India' };
  const isMetro = METRO_PINCODES.has(prefix);
  const isRemote = prefix === '79' || prefix === '19'; // NE states, Leh/Kashmir remote

  const tier = isMetro ? 'metro' : isRemote ? 'remote' : 'tier1';
  const transitMin = isMetro ? 2 : isRemote ? 5 : 3;
  const transitMax = isMetro ? 3 : isRemote ? 7 : 5;

  const now = new Date();
  const minDeliveryDate = addBusinessDays(now, productionTimeDays + transitMin);
  const maxDeliveryDate = addBusinessDays(now, productionTimeDays + transitMax);

  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const minStr = minDeliveryDate.toLocaleDateString('en-IN', formatOptions);
  const maxStr = maxDeliveryDate.toLocaleDateString('en-IN', formatOptions);

  return {
    valid: true,
    pincode: clean,
    serviceable: true,
    region: info.region,
    state: info.state,
    tier,
    estimatedDispatchDays: productionTimeDays,
    estimatedTransitDaysMin: transitMin,
    estimatedTransitDaysMax: transitMax,
    estimatedDeliveryText: `Estimated delivery by ${minStr} – ${maxStr}`,
    codAvailable: !isRemote,
    prepaidAvailable: true,
  };
}
