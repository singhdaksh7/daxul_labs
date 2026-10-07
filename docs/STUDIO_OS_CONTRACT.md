# DAXUL Studio OS — shared contract for parallel work

Stack: Next 16 (read `node_modules/next/dist/docs/` before using unfamiliar APIs; `middleware.ts` is the "proxy"), Prisma 6/PostgreSQL, next-auth v4 JWT, Tailwind 4.
Design: Carbon #0B0B0C, Dark #151515, Graphite #242426, Bone #F3F0E9, Gray #B9B9B4, Lime #C8FF35. Do NOT redesign the storefront; only swap its data source.

## Rules
- Schema is FINAL for this phase (already migrated in `prisma/migrations/20261008000000_add_studio_os`). Do NOT edit `prisma/schema.prisma` or add migrations. If you truly need a change, write it in your final report and do not apply it.
- Every `/api/admin/**` handler: `const g = await guardAdmin(); if (!g.ok) return g.response;` (lib/adminApi.ts), validate bodies with Zod via `parseBody`, record mutations with `logAdminAction`.
- Never expose cost data (`Product.businessCosts`), password hashes, secrets, or private media URLs to storefront/public endpoints.
- Storefront reads PostgreSQL via server-side helpers; no mock arrays / localStorage for catalog, orders, coupons, settings, policies, theme. (Cart alone may live in localStorage.)
- Do not touch: Dockerfile, docker-compose.yml, .github/, deploy config, `.env*`. Never run prisma db push / migrate reset. Don't deploy; don't push. Commit on your worktree branch only.
- Verify with `npx prisma generate` and `npm run build` (DB errors during build are expected: no local DB). No local Postgres exists, so do not claim DB-run tests you did not run; state what was only compile-verified.

## File ownership (avoid merge conflicts)
- Agent A (storefront data layer): `lib/catalog.ts` (new), `lib/storeContext.tsx`, `lib/cart*`, `lib/types.ts`, `lib/initialData.ts`, `app/{page,shop,collections,customize,lab,about,account,track,checkout,policies}/**`, `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, `components/*` (non-admin), `app/api/track/**`, `app/api/cms/**`, `lib/theme*`, `prisma/seed-catalog.ts`.
- Agent B (admin shell, ops): `app/admin/(studio)/layout.tsx`, `app/admin/(studio)/page.tsx` (dashboard), `app/admin/(studio)/{orders,customers,coupons,analytics}/**`, `app/api/admin/{orders,customers,coupons,analytics,dashboard}/**`, `components/admin/shell/**`. B also MOVES the existing `app/admin/page.tsx` out (delete it) and moves `app/admin/site-editor` to `app/admin/(studio)/site-editor` (keep it working), keeps `app/admin/login` outside the group, and defines the sidebar linking to ALL routes below.
- Agent C (catalog admin): `app/admin/(studio)/{products,collections,inventory}/**`, `app/api/admin/{products,collections,inventory}/**`, `lib/pricing.ts` (new: server-side price calc incl. variants/custom-field fees/coupon-agnostic), `app/api/razorpay/create-order/route.ts`.
- Agent D (content/system admin): `app/admin/(studio)/{policies,seo,settings,theme,audit,media}/**`, `app/api/admin/{policies,seo,settings,theme,audit,media}/**`, `app/api/public/{settings,policies,theme}/**` if needed, `components/admin/content/**`.

## Sidebar routes (Agent B builds the nav; others create these pages)
Dashboard /admin · Orders /admin/orders · Products /admin/products · Collections /admin/collections · Customers /admin/customers · Coupons /admin/coupons · Manufacturing /admin/orders?view=manufacturing · Customizations /admin/orders?view=customizations · Inventory /admin/inventory · Site Editor /admin/site-editor · Media Library /admin/media · Policies /admin/policies · SEO /admin/seo · Analytics /admin/analytics · Store Settings /admin/settings · Theme /admin/theme · Audit Logs /admin/audit

## Shared helpers (exist)
`lib/adminApi.ts` guardAdmin / parseBody / logAdminAction / serverError; `lib/db.ts` prisma; `lib/auth.ts` getAuthSession, requireAdminSession; CMS: `lib/cmsService.ts`; storage: `lib/storage`.
