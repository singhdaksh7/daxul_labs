import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, serverError } from '@/lib/adminApi';
import { getCustomerDetail, listCustomers } from '@/lib/adminQueries';

export const dynamic = 'force-dynamic';

// Customers are derived from Order rows (grouped by lowercased email). User.passwordHash is never read here.
export async function GET(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    const sp = req.nextUrl.searchParams;
    const email = sp.get('email');
    if (email) {
      const detail = await getCustomerDetail(email.slice(0, 254));
      if (!detail) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      return NextResponse.json({ success: true, customer: detail });
    }
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
    const result = await listCustomers({ search: sp.get('q')?.slice(0, 100) ?? undefined, page });
    return NextResponse.json({ success: true, ...result, page });
  } catch (err) {
    return serverError(err, 'Admin GET Customers Error:');
  }
}
