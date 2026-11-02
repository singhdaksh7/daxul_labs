import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { paiseToRupees } from '@/lib/finance/money';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'expenses';

  let csvContent = '';
  const sanitize = (val: any) => {
    let str = String(val ?? '').replace(/"/g, '""');
    // Prevent spreadsheet formula injection (=, +, -, @)
    if (/^[=+\-@]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str}"`;
  };

  if (type === 'expenses') {
    const expenses = await prisma.businessExpense.findMany({
      include: { paidByPartner: true },
      orderBy: { expenseDate: 'desc' },
    });
    const header = ['Expense No', 'Date', 'Title', 'Category', 'Classification', 'Amount (INR)', 'Paid By', 'Status'];
    const rows = expenses.map((e) => [
      e.expenseNumber,
      e.expenseDate.toISOString().slice(0, 10),
      e.title,
      e.category,
      e.classification,
      paiseToRupees(e.totalAmountPaise),
      e.paidByPartner?.displayName || (e.isBusinessAccountPaid ? 'Business Account' : 'N/A'),
      e.status,
    ]);
    csvContent = [header, ...rows].map((r) => r.map(sanitize).join(',')).join('\n');
  } else if (type === 'settlements') {
    const settlements = await prisma.partnerSettlement.findMany({
      include: { fromPartner: true, toPartner: true },
      orderBy: { paymentDate: 'desc' },
    });
    const header = ['Settlement No', 'Date', 'From Partner', 'To Partner', 'Amount (INR)', 'Method', 'Reference', 'Status'];
    const rows = settlements.map((s) => [
      s.settlementNumber,
      s.paymentDate.toISOString().slice(0, 10),
      s.fromPartner.displayName,
      s.toPartner.displayName,
      paiseToRupees(s.amountPaise),
      s.paymentMethod,
      s.referenceNumber || '',
      s.status,
    ]);
    csvContent = [header, ...rows].map((r) => r.map(sanitize).join(',')).join('\n');
  } else {
    return NextResponse.json({ error: 'Unsupported export type' }, { status: 400 });
  }

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="daxul-finance-${type}-${Date.now()}.csv"`,
    },
  });
}

