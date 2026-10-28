import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAuthSession();
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!session || !sessionUser?.id) return NextResponse.json({ wishlist: [] });

  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: sessionUser.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            images: true,
            stock: true,
            customizable: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      wishlist: items.map((i) => i.product),
    });
  } catch (err: any) {
    console.error('Wishlist Fetch Error:', err);
    return NextResponse.json({ error: 'Failed to retrieve wishlist' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!session || !sessionUser?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  try {
    const { productId } = await req.json();
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    await prisma.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId: sessionUser.id,
          productId,
        },
      },
      create: {
        userId: sessionUser.id,
        productId,
      },
      update: {},
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Wishlist Add Error:', err);
    return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAuthSession();
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!session || !sessionUser?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  try {
    const productId = req.nextUrl.searchParams.get('productId');
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

    await prisma.wishlistItem.deleteMany({
      where: {
        userId: sessionUser.id,
        productId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Wishlist Remove Error:', err);
    return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
  }
}
