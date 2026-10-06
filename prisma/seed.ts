import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DAXUL LABS PostgreSQL database...');

  // 1. Create Super Admin User (Secure Bootstrap)
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || process.env.ADMIN_INIT_EMAIL;
  const adminPass = process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_INIT_PASSWORD;

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (existingSuperAdmin) {
    console.log(`ℹ Super Admin already exists in database (${existingSuperAdmin.email}). Skipping bootstrap admin creation.`);
  } else if (!adminEmail || !adminPass) {
    console.log('⚠️ No INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD configured in environment and no SUPER_ADMIN exists. Skipping super admin creation.');
  } else {
    // Require strong password: at least 12 chars, upper, lower, digit, special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_-])[A-Za-z\d@$!%*?&#^()_-]{12,}$/;
    if (!passwordRegex.test(adminPass)) {
      throw new Error(
        'SECURITY EXCEPTION: INITIAL_ADMIN_PASSWORD must be at least 12 characters long and contain uppercase, lowercase, number, and special character (@$!%*?&#^()_-).'
      );
    }

    const hashedPassword = await bcrypt.hash(adminPass, 12);

    await prisma.user.create({
      data: {
        name: 'DAXUL Super Admin',
        email: adminEmail.toLowerCase().trim(),
        passwordHash: hashedPassword,
        role: 'SUPER_ADMIN',
      },
    });

    console.log(`✓ Super Admin created for email: ${adminEmail.toLowerCase().trim()}`);
    console.log('🔒 SECURITY NOTICE: Please remove INITIAL_ADMIN_PASSWORD from your .env file after initialization.');
  }

  // 2. Default Site Settings
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      announcementBarText: 'ON-DEMAND PRODUCTION • FREE SHIPPING ON ORDERS OVER ₹1999',
      announcementBarEnabled: true,
      brandName: 'DAXUL LABS',
      brandTagline: 'Objects Made Differently.',
      brandDescription:
        'DAXUL LABS is an independent 3D design studio in India creating minimal lighting objects, personalized monoliths, devotional altars, and workspace decor.',
      contactEmail: 'studio@daxullabs.com',
      contactPhone: '+91 98765 43210',
      whatsAppNumber: '+919876543210',
      instagramUrl: 'https://instagram.com/daxullabs',
      footerText: '© 2026 DAXUL LABS. CRAFTED ON-DEMAND IN INDIA.',
      standardShippingFee: 99,
      expressShippingFee: 199,
      freeShippingThreshold: 1999,
      codFee: 50,
      globalCodEnabled: true,
      currencySymbol: '₹',
      currencyCode: 'INR',
      seoTitle: 'DAXUL LABS | Designed 3D Printed Objects & Projection Lamps',
      seoDescription:
        'Independent Indian design brand crafting shadow projection lamps, personalized couple monoliths, devotional altars, and minimal desk objects.',
      shippingPolicyText:
        'All DAXUL LABS products are manufactured on-demand. Production takes 2-4 business days. Standard courier delivery takes 3-5 business days across India.',
      returnPolicyText:
        'We offer a 7-day replacement guarantee for items damaged in transit or defective electronic LED components.',
      privacyPolicyText:
        'Customer uploaded photos and custom inscriptions are strictly processed for order fulfillment and stored securely.',
      termsConditionsText:
        'By ordering from DAXUL LABS, you agree to our custom on-demand production schedules.',
      cancellationPolicyText:
        'Orders can be cancelled within 6 hours of placement before 3D slicing begins.',
    },
  });

  // 3. Default Theme Settings
  await prisma.themeSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      backgroundColor: '#0B0B0C',
      cardBackgroundColor: '#151515',
      accentColor: '#C8FF35',
      textColor: '#FFFFFF',
      secondaryTextColor: '#B9B9B4',
      buttonColor: '#C8FF35',
      buttonTextColor: '#0B0B0C',
      fontFamily: 'var(--font-geist-sans), sans-serif',
      headingSizeMultiplier: 1.0,
      borderRadius: 'md',
      cardStyle: 'glass',
    },
  });

  // 4. Default Collections
  const collections = [
    {
      name: 'Shadow Objects',
      slug: 'shadow-objects',
      description: 'Precision lamps that project geometric shadows across dark rooms.',
      image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop',
      badge: 'Flagship Series',
      featured: true,
    },
    {
      name: 'Personalized & Couples',
      slug: 'personalized-couples',
      description: 'Dual-perspective name monoliths and custom photo lithophanes.',
      image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1000&auto=format&fit=crop',
      badge: 'Bespoke Gifts',
      featured: true,
    },
    {
      name: 'Devotional Altars',
      slug: 'devotional-altars',
      description: 'Sacred geometry pillars and backlit mantra sanctuaries.',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop',
      badge: 'Sacred Series',
      featured: true,
    },
  ];

  for (const c of collections) {
    await prisma.collection.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }

  console.log('✓ Default collections seeded');

  // 5. Default Coupon
  await prisma.coupon.upsert({
    where: { code: 'DAXUL10' },
    update: {},
    create: {
      code: 'DAXUL10',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 999,
      isActive: true,
    },
  });

  console.log('✓ Default DAXUL10 coupon seeded');
  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
