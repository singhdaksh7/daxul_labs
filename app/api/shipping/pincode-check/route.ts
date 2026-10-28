import { NextRequest, NextResponse } from 'next/server';
import { checkPincode } from '@/lib/pincode';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const pincode = sp.get('pincode') || '';
  const productionDays = Math.max(1, parseInt(sp.get('productionDays') || '2', 10) || 2);

  const result = checkPincode(pincode, productionDays);

  if (!result.valid) {
    return NextResponse.json(
      { error: result.estimatedDeliveryText, ...result },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    ...result,
  });
}
