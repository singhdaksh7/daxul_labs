import { cancelBusinessExpense, ExpenseCancelError } from '@/lib/finance/expenses';
import { canManageEmi } from '@/lib/finance/emiAuth';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const expense = await prisma.businessExpense.findUnique({
    where: { id },
    include: {
      paidByPartner: { select: { id: true, displayName: true, email: true } },
      shares: {
        include: {
          partner: { select: { id: true, displayName: true, email: true } },
          allocations: {
            include: {
              settlement: {
                select: { id: true, settlementNumber: true, status: true, paymentDate: true },
              },
            },
          },
        },
      },
      emiSchedule: {
        include: {
          installments: {
            include: {
              partnerObligations: {
                include: {
                  partner: { select: { id: true, displayName: true } },
                },
              },
            },
            orderBy: { installmentNumber: 'asc' },
          },
        },
      },
      attachments: { orderBy: { uploadedAt: 'desc' } },
      ledgerEntries: {
        include: {
          partner: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  // Construct chronological timeline events
  const timeline: Array<{ event: string; timestamp: Date; actor: string; details?: any }> = [];

  timeline.push({
    event: 'EXPENSE_CREATED',
    timestamp: expense.createdAt,
    actor: expense.createdBy,
    details: { expenseNumber: expense.expenseNumber, totalAmount: expense.totalAmountPaise.toString() },
  });

  for (const att of expense.attachments) {
    timeline.push({
      event: `ATTACHMENT_UPLOADED: ${att.type}`,
      timestamp: att.uploadedAt,
      actor: att.uploadedBy,
      details: { fileName: att.fileName },
    });
  }

  for (const entry of expense.ledgerEntries) {
    timeline.push({
      event: `LEDGER_RECORDED: ${entry.type}`,
      timestamp: entry.createdAt,
      actor: entry.createdBy,
      details: {
        partnerName: entry.partner.displayName,
        amount: entry.amountPaise.toString(),
        direction: entry.direction,
      },
    });
  }

  // Sort timeline chronologically
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const safeExpense = JSON.parse(
    JSON.stringify(expense, (k, v) => (typeof v === 'bigint' ? v.toString() : v))
  );

  return NextResponse.json({
    expense: safeExpense,
    timeline,
  });
}

const cancelSchema = z.object({
  reason: z.string().min(3),
});

/**
 * Cancels an expense cleanly without hard delete.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const json = await req.json().catch(() => ({}));
  const parsed = cancelSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'A cancellation reason is required (minimum 3 characters)' }, { status: 400 });
  }

  const actor = check.session?.user as { id?: string } | undefined;
  const target = await prisma.businessExpense.findUnique({ where: { id }, select: { paidByPartnerId: true } });
  if (!target) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  if (!(await canManageEmi({ id: actor?.id, role: check.role }, target.paidByPartnerId))) {
    return NextResponse.json({ error: 'Only the paying partner or a SUPER_ADMIN can cancel an expense' }, { status: 403 });
  }

  let updated;
  try {
    updated = await cancelBusinessExpense({ expenseId: id, reason: parsed.data.reason, createdBy: actor?.id || 'admin' });
  } catch (err) {
    if (err instanceof ExpenseCancelError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('Expense cancel failed', err);
    return NextResponse.json({ error: 'Failed to cancel expense' }, { status: 500 });
  }

  const adminUserId = (check.session?.user as any)?.id || 'admin';
  const adminUserEmail = check.session?.user?.email || 'admin@daxullabs.com';

  // Record audit log
  await prisma.auditLog.create({
    data: {
      adminUserId,
      adminUserEmail,
      action: 'EXPENSE_CANCELLED',
      entityType: 'BusinessExpense',
      entityId: id,
      details: { reason: parsed.data.reason },
    },
  });

  return NextResponse.json({ success: true, expense: JSON.parse(JSON.stringify(updated, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))) });
}


const uploadProofSchema = z.object({
  action: z.literal('UPLOAD_PROOF'),
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().default('application/pdf'),
  description: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const json = await req.json().catch(() => ({}));
  const parsed = uploadProofSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const adminEmail = check.session?.user?.email || 'admin@daxullabs.com';

  const attachment = await prisma.expenseAttachment.create({
    data: {
      expenseId: id,
      type: 'INVOICE',
      fileUrl: parsed.data.fileUrl,
      fileName: parsed.data.fileName,
      fileSize: parsed.data.fileSize || 10240,
      mimeType: parsed.data.mimeType,
      notes: parsed.data.description,
      uploadedBy: adminEmail,
    },
  });

  return NextResponse.json({ success: true, attachment });
}
