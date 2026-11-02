import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createBusinessExpense } from '@/lib/finance/expenses';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  const expenses = await prisma.businessExpense.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { vendor: { contains: q, mode: 'insensitive' } },
            { expenseNumber: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {},
    include: {
      paidByPartner: { select: { id: true, displayName: true } },
      shares: { include: { partner: { select: { id: true, displayName: true } } } },
      emiSchedule: true,
      attachments: true,
    },
    orderBy: { expenseDate: 'desc' },
    take: 50,
  });

  // emiSchedule/attachments carry BigInt columns too, so convert the whole tree.
  const safeExpenses = JSON.parse(JSON.stringify(expenses, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));

  return NextResponse.json({ expenses: safeExpenses });
}

const expenseSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  category: z.enum([
    'THREE_D_PRINTER',
    'FILAMENT',
    'RAW_MATERIAL',
    'ELECTRONICS',
    'PACKAGING',
    'COURIER',
    'SHIPPING',
    'SOFTWARE',
    'DOMAIN',
    'HOSTING',
    'ADS',
    'MARKETING',
    'RENT',
    'ELECTRICITY',
    'INTERNET',
    'TOOLS',
    'EQUIPMENT',
    'MAINTENANCE',
    'OFFICE',
    'TRAVEL',
    'PROFESSIONAL_SERVICES',
    'TAX',
    'OTHER',
  ]),
  classification: z.enum(['OPERATING_EXPENSE', 'CAPITAL_EXPENSE', 'INVENTORY_PURCHASE', 'ORDER_DIRECT_COST', 'PARTNER_ADVANCE', 'OTHER']).optional(),
  vendor: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  expenseDate: z.string().optional(),
  totalAmountRupees: z.number().positive(),
  taxAmountRupees: z.number().min(0).optional(),
  paymentMethod: z.string().optional(),
  paidByPartnerId: z.string().optional().nullable(),
  isBusinessAccountPaid: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = expenseSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const adminId = (check.session?.user as any)?.id || 'admin';
    const expense = await createBusinessExpense({
      ...parsed.data,
      expenseDate: parsed.data.expenseDate ? new Date(parsed.data.expenseDate) : undefined,
      description: parsed.data.description || undefined,
      vendor: parsed.data.vendor || undefined,
      invoiceNumber: parsed.data.invoiceNumber || undefined,
      paidByPartnerId: parsed.data.paidByPartnerId || undefined,
      notes: parsed.data.notes || undefined,
      createdBy: adminId,
    });

    const safeExpense = JSON.parse(JSON.stringify(expense, (k, v) => typeof v === 'bigint' ? v.toString() : v));
    return NextResponse.json({ success: true, expense: safeExpense });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create expense' }, { status: 400 });
  }
}

