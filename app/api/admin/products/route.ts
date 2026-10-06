import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { authorized, reason } = await requireAdminSession();
    if (!authorized) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      include: { customFields: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { authorized, reason, session } = await requireAdminSession();
    if (!authorized || !session) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      slug,
      category,
      price,
      compareAtPrice,
      description,
      story,
      specs,
      careInstructions,
      faq,
      images,
      videoUrl,
      badge,
      stock,
      productionTimeDays,
      estimatedDispatchDays,
      prepaidOnly,
      codEnabled,
      finishes,
      colors,
      sizes,
      businessCosts,
      customFields,
    } = body;

    if (!name || !slug || price === undefined) {
      return NextResponse.json({ error: 'Name, slug, and price are required' }, { status: 400 });
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name,
          slug,
          category: category || 'Shadow Objects',
          price: Number(price),
          compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
          description: description || '',
          story,
          specs,
          careInstructions: careInstructions || [],
          faq,
          images: images || [],
          videoUrl,
          badge,
          stock: stock !== undefined ? Number(stock) : 10,
          productionTimeDays: productionTimeDays ? Number(productionTimeDays) : 2,
          estimatedDispatchDays: estimatedDispatchDays ? Number(estimatedDispatchDays) : 3,
          prepaidOnly: Boolean(prepaidOnly),
          codEnabled: codEnabled !== undefined ? Boolean(codEnabled) : true,
          finishes: finishes || [],
          colors: colors || [],
          sizes: sizes || [],
          businessCosts,
          customFields: {
            create: (customFields || []).map((cf: any) => ({
              label: cf.label,
              type: cf.type || 'text',
              required: Boolean(cf.required),
              options: cf.options || [],
              fee: Number(cf.fee || 0),
              placeholder: cf.placeholder,
              helpText: cf.helpText,
            })),
          },
        },
        include: { customFields: true },
      });

      await tx.auditLog.create({
        data: {
          adminUserId: (session?.user as any)?.id || null,
          adminUserEmail: session?.user?.email || 'admin@daxullabs.com',
          action: 'CREATE_PRODUCT',
          entityType: 'PRODUCT',
          entityId: created.id,
          details: { productName: created.name, slug: created.slug, price: created.price },
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    console.error('Admin POST Product Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { authorized, reason, session } = await requireAdminSession();
    if (!authorized || !session) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required for update' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.slug && { slug: data.slug }),
          ...(data.category && { category: data.category }),
          ...(data.price !== undefined && { price: Number(data.price) }),
          ...(data.stock !== undefined && { stock: Number(data.stock) }),
          ...(data.isArchived !== undefined && { isArchived: Boolean(data.isArchived) }),
          ...(data.isFeatured !== undefined && { isFeatured: Boolean(data.isFeatured) }),
          ...(data.images && { images: data.images }),
        },
      });

      await tx.auditLog.create({
        data: {
          adminUserId: (session?.user as any)?.id || null,
          adminUserEmail: session?.user?.email || 'admin@daxullabs.com',
          action: 'UPDATE_PRODUCT',
          entityType: 'PRODUCT',
          entityId: id,
          details: { updatedFields: Object.keys(data) },
        },
      });

      return prod;
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { authorized, reason, session } = await requireAdminSession();
    if (!authorized || !session) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { isArchived: true },
      });

      await tx.auditLog.create({
        data: {
          adminUserId: (session?.user as any)?.id || null,
          adminUserEmail: session?.user?.email || 'admin@daxullabs.com',
          action: 'ARCHIVE_PRODUCT',
          entityType: 'PRODUCT',
          entityId: id,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Product archived successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to archive product' }, { status: 500 });
  }
}
