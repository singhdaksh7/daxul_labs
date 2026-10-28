import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

function phonesMatch(a: string, b: string): boolean {
  const da = a.replace(/\D/g, '');
  const db = b.replace(/\D/g, '');
  if (da.length < 7 || db.length < 7) return false;
  return da.slice(-10) === db.slice(-10);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const cleanNumber = orderNumber.trim().toUpperCase();

    const order = await prisma.order.findUnique({
      where: { orderNumber: cleanNumber },
      include: {
        items: true,
      },
    });

    if (!order) {
      return new NextResponse('Order not found', { status: 404 });
    }

    // Access control:
    // 1. Admin session
    // 2. Matching Customer session
    // 3. Guest verification query parameter: ?verify=emailOrPhone
    const session = await getAuthSession();
    const sessionEmail = session?.user?.email?.toLowerCase();
    const sessionRole = (session?.user as any)?.role;
    const isAdmin = sessionRole === 'ADMIN' || sessionRole === 'SUPER_ADMIN';

    const verifyQuery = req.nextUrl.searchParams.get('verify')?.trim() || '';
    const isOwner =
      sessionEmail && sessionEmail === order.customerEmail.toLowerCase();
    const isVerifiedGuest =
      verifyQuery &&
      (verifyQuery.toLowerCase() === order.customerEmail.toLowerCase() ||
        phonesMatch(verifyQuery, order.customerPhone));

    if (!isAdmin && !isOwner && !isVerifiedGuest) {
      return new NextResponse(
        'Unauthorized: You do not have permission to view this invoice.',
        { status: 403 }
      );
    }

    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
    });

    const brandName = settings?.brandName || 'DAXUL LABS';
    const contactEmail = settings?.contactEmail || 'studio@daxullabs.com';
    const contactPhone = settings?.contactPhone || '+91 98765 43210';
    const businessAddress =
      settings?.businessAddress || 'DAXUL LABS Studio, Precision 3D Printing Facility, India';
    const gstEnabled = !!settings?.gstEnabled && !!settings?.gstNumber;
    const gstNumber = settings?.gstNumber || '';

    const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const invoiceNumber = `INV-${new Date(order.createdAt).getFullYear()}-${order.orderNumber}`;

    const subtotal = order.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

    const itemsRows = order.items
      .map(
        (it, idx) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px;">${idx + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">
          <div style="font-weight: 600; font-size: 13px; color: #111827;">${it.productName}</div>
          ${
            it.selectedFinish || it.selectedColor || it.selectedSize
              ? `<div style="font-size: 11px; color: #6B7280; margin-top: 2px;">${[
                  it.selectedFinish,
                  it.selectedColor,
                  it.selectedSize,
                ]
                  .filter(Boolean)
                  .join(' • ')}</div>`
              : ''
          }
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center; font-size: 13px;">${it.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-size: 13px; font-family: monospace;">₹${it.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-size: 13px; font-weight: 600; font-family: monospace;">₹${(it.unitPrice * it.quantity).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoice #${invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111827; background-color: #FFFFFF; margin: 0; padding: 24px; font-size: 13px; line-height: 1.5; }
    .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; padding: 32px; background: #FFFFFF; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 20px; }
    .brand-title { font-size: 22px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #111827; }
    .brand-subtitle { font-size: 11px; color: #6B7280; text-transform: uppercase; margin-top: 4px; }
    .invoice-badge { text-align: right; }
    .invoice-title { font-size: 20px; font-weight: 700; text-transform: uppercase; color: #111827; margin: 0; }
    .invoice-num { font-family: monospace; font-size: 13px; color: #4B5563; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin: 28px 0; }
    .meta-box h4 { margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #6B7280; letter-spacing: 0.05em; }
    .meta-box p { margin: 2px 0; font-size: 12px; color: #1F2937; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th { background: #F9FAFB; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #4B5563; border-bottom: 1px solid #E5E7EB; }
    .totals-box { margin-top: 24px; margin-left: auto; width: 280px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: #4B5563; }
    .total-row.grand { border-top: 2px solid #111827; margin-top: 6px; padding-top: 8px; font-size: 16px; font-weight: 700; color: #111827; }
    .print-bar { text-align: right; margin-bottom: 16px; max-width: 800px; margin-left: auto; margin-right: auto; }
    .print-btn { background: #111827; color: #FFFFFF; border: none; padding: 8px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; border-radius: 6px; cursor: pointer; }
    @media print {
      body { padding: 0; background: none; }
      .invoice-card { border: none; padding: 0; }
      .print-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button onclick="window.print()" class="print-btn">Print / Save PDF</button>
  </div>

  <div class="invoice-card">
    <div class="header-row">
      <div>
        <div class="brand-title">${brandName}</div>
        <div class="brand-subtitle">On-Demand 3D Fabrication Studio</div>
        <div style="font-size: 11px; color: #6B7280; margin-top: 8px; max-width: 280px;">${businessAddress}</div>
        <div style="font-size: 11px; color: #6B7280;">Email: ${contactEmail} | Phone: ${contactPhone}</div>
        ${gstEnabled ? `<div style="font-size: 11px; font-weight: 600; color: #111827; margin-top: 4px;">GSTIN: ${gstNumber}</div>` : ''}
      </div>
      <div class="invoice-badge">
        <h1 class="invoice-title">Tax Invoice</h1>
        <div class="invoice-num"># ${invoiceNumber}</div>
        <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">Date: ${invoiceDate}</div>
        <div style="font-size: 12px; color: #6B7280;">Order: <strong>${order.orderNumber}</strong></div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <h4>Billed & Shipped To</h4>
        <p style="font-weight: 600; font-size: 13px;">${order.customerName}</p>
        <p>${order.street}</p>
        <p>${order.city}, ${order.state} - ${order.pincode}</p>
        <p>${order.country}</p>
        <p>Email: ${order.customerEmail}</p>
        <p>Phone: ${order.customerPhone}</p>
      </div>
      <div class="meta-box" style="text-align: right;">
        <h4>Payment & Delivery Info</h4>
        <p>Method: <strong>${order.paymentMethod.toUpperCase()}</strong></p>
        <p>Status: <strong style="text-transform: uppercase;">${order.paymentStatus}</strong></p>
        ${order.razorpayPaymentId ? `<p style="font-family: monospace;">Payment ID: ${order.razorpayPaymentId}</p>` : ''}
        <p>Shipping: <strong>${order.shippingMethod}</strong></p>
        ${order.trackingNumber ? `<p style="font-family: monospace;">AWB: ${order.trackingNumber}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Description</th>
          <th style="text-align: center; width: 60px;">Qty</th>
          <th style="text-align: right; width: 100px;">Rate</th>
          <th style="text-align: right; width: 110px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals-box">
      <div class="total-row">
        <span>Subtotal:</span>
        <span style="font-family: monospace;">₹${subtotal.toFixed(2)}</span>
      </div>
      ${
        order.discountAmount > 0
          ? `<div class="total-row" style="color: #059669;">
               <span>Discount (${order.couponCode || 'Promo'}):</span>
               <span style="font-family: monospace;">-₹${order.discountAmount.toFixed(2)}</span>
             </div>`
          : ''
      }
      <div class="total-row">
        <span>Shipping:</span>
        <span style="font-family: monospace;">${order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee.toFixed(2)}`}</span>
      </div>
      ${
        order.codFee > 0
          ? `<div class="total-row">
               <span>COD Fee:</span>
               <span style="font-family: monospace;">₹${order.codFee.toFixed(2)}</span>
             </div>`
          : ''
      }
      ${
        gstEnabled
          ? `<div class="total-row" style="font-size: 11px; color: #6B7280;">
               <span>Includes 18% GST:</span>
               <span style="font-family: monospace;">₹${((order.totalAmount * 18) / 118).toFixed(2)}</span>
             </div>`
          : ''
      }
      <div class="total-row grand">
        <span>Total:</span>
        <span style="font-family: monospace;">₹${order.totalAmount.toFixed(2)}</span>
      </div>
    </div>

    <div style="margin-top: 48px; border-top: 1px solid #E5E7EB; padding-top: 16px; font-size: 11px; color: #9CA3AF; text-align: center;">
      This is a computer-generated tax invoice for on-demand manufactured goods. DAXUL LABS.
    </div>
  </div>
</body>
</html>
    `.trim();

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err: any) {
    console.error('Invoice Generation Error:', err);
    return new NextResponse('Internal server error rendering invoice', { status: 500 });
  }
}
