# Admin API and upload security audit

Scope: every `route.ts` under `app/api/admin/**` plus `app/api/upload/route.ts` and `app/api/uploads/file/[filename]/route.ts`.
Method: static code review plus `tsc --noEmit` and `next build --webpack` (compile-verified only). **Nothing here was exercised against a running server or database**, so the 401/403 behaviour below is derived from reading `requireAdminSession()` / `guardAdmin()`, not from live requests.

Role model: `requireAdminSession()` returns `Unauthenticated` (no session) or `Forbidden` (role not ADMIN/SUPER_ADMIN). `guardAdmin()` maps these to **401** and **403** respectively, so a CUSTOMER gets 403 and an anonymous caller gets 401. Inline use of `requireAdminSession()` without that mapping returns the same status for both (see findings).

## Route matrix

Legend: G = server-side admin guard, Z = Zod validation of input, A = mutation audit-logged, 401/403 = correct statuses (anon 401, CUSTOMER 403).

| Route | Methods | G | Z | A | 401/403 | Owner | State |
|---|---|---|---|---|---|---|---|
| `admin/policies` | GET, PUT | yes (guardAdmin) | yes | yes (`logAdminAction`) | yes | D | new |
| `admin/settings` | GET, PUT | yes | yes | yes (diff of changed keys) | yes | D | new |
| `admin/theme` | GET, PUT | yes | yes (strict `#RRGGBB`, radius enum) | yes | yes | D | new |
| `admin/theme/reset` | POST | yes | n/a (no body) | yes | yes | D | new |
| `admin/seo` | GET, PUT | yes | yes | yes | yes | D | new |
| `admin/audit` | GET | yes | yes (query) | n/a read-only; metadata redacted | yes | D | new |
| `admin/cms/media` | GET, POST, PATCH, DELETE | yes | POST: manual (file presence, MIME allowlist, 50MB); PATCH: Zod; DELETE: id check | yes (central AuditLog via `logAdminAction`) | yes | D | **fixed** |
| `admin/cms/audit` | GET | yes | n/a | n/a read-only; metadata redacted | yes | D | **fixed** (was 401 for CUSTOMER) |
| `admin/cms/sections` | GET, POST | yes | yes (discriminated union, section-key enum) | yes (CmsAuditLog inside `lib/cmsService.ts`) | yes | D | **fixed** (was 401 for CUSTOMER, unvalidated `order` array, raw error messages) |
| `admin/cms/sections/[key]` | GET, PUT, POST | yes | yes (key enum, action enum, `draftContent` must be an object) | yes (CmsAuditLog inside `lib/cmsService.ts`) | yes | D | **fixed** (same issues) |
| `admin/orders` | GET, PATCH | yes (inline `requireAdminSession`) | **no** | yes (in transaction) | **partial**: both anon and CUSTOMER get 403 | B | findings only |
| `admin/products` | GET, POST, PUT, DELETE | yes (inline) | **no** | yes (in transaction) | **partial**: anon gets 403 not 401 | C | findings only |
| `upload` | POST | **was none**, now requires any logged-in user | manual allowlist | n/a (customer data; recorded in `UploadedFile`) | 401 anon | D | **fixed** |
| `uploads/file/[filename]` | GET | see access model | filename regex | n/a | see below | D | **fixed** |

Not present in this branch (owned by other agents, not reviewed): `admin/customers`, `admin/coupons`, `admin/analytics`, `admin/dashboard`, `admin/inventory`, `admin/collections`. They must follow the contract (`guardAdmin`, `parseBody`, `logAdminAction`); re-run this matrix after merging.

## Findings in files owned by other agents (not changed by me)

**Agent B, `app/api/admin/orders/route.ts`**
1. Returns **403 for unauthenticated** callers (uses `reason` with a fixed 403). Use `guardAdmin()` so anon gets 401.
2. PATCH reads the raw JSON body with no validation. `status` and `paymentStatus` are passed straight to Prisma; an invalid enum value throws and surfaces as a 500 with `err.message` (leaks Prisma internals to the client). Validate with Zod enums (`OrderStatus`, `PaymentStatus`), cap `note`/`qcNotes`/`courierName` lengths.
3. Error responses echo `err.message` (500). Use `serverError()`.
4. `GET` loads all orders with items and history unbounded; add pagination. (Performance, not security.)
5. Audit details include `trackingNumber` and free-text `note`; acceptable, but note admin audit viewers can see them.
6. No transition rules: any status can be set from any status (e.g. back from DELIVERED to PLACED). Consider a state machine.

**Agent C, `app/api/admin/products/route.ts`**
1. Anon gets 403 instead of 401 (same inline pattern).
2. POST/PUT/DELETE have no Zod validation. POST takes `specs`, `faq`, `businessCosts` as unvalidated JSON; `price`/`stock` use `Number(...)` so `NaN`, negative or absurd values are accepted. PUT builds `data` from truthy checks (`data.price !== undefined && Number(data.price)`), so `NaN` can reach Prisma.
3. `images`/`videoUrl` accept arbitrary URLs/strings, including `javascript:` or third-party tracking URLs. Restrict to app media paths (`/api/uploads/file/...`) or https URLs.
4. 500 responses return `err.message` (Prisma errors including unique-constraint target names).
5. GET returns `businessCosts` (cost data) to any admin; fine for admin, but make sure no public route ever reuses this select.
6. DELETE of a product referenced by `OrderItem` should be blocked or converted to archive; confirm the FK behaviour.
7. Audit: PUT logs `Object.keys(data)` only (no before/after). OK, but weak for forensic use.

**General**
- None of the `/api/admin` routes enforce an `Origin`/`Sec-Fetch-Site` check. Current protection relies on `SameSite=Lax` session cookies plus JSON bodies. Multipart POSTs (media upload) are still blocked cross-site by Lax. Consider a shared same-origin check in `guardAdmin()` for mutating methods as defence in depth.
- `middleware.ts` only matches `/admin/:path*` (pages). `/api/admin/**` is protected purely by each handler's own guard, so one forgotten guard is an unauthenticated hole. A matcher for `/api/admin/:path*` returning 401/403 would give a second layer.

## Changes made (files I own)

- `lib/adminApi.ts` guard used everywhere in the new routes; CMS routes migrated from ad-hoc `requireAdminSession()` (which returned 401 for CUSTOMER) to `guardAdmin()` (403).
- CMS section routes: Zod-validated actions, key allowlist, errors no longer leak `err.message`.
- `admin/cms/media`: MIME allowlist (JPEG, PNG, WEBP, AVIF, GIF, MP4, WEBM; **SVG and PDF excluded** for the admin library), 50MB cap with 413, storage validation errors mapped to 400, unexpected errors to generic 500, alt-text PATCH, DELETE refused with **409 plus a usage list** when referenced by a HomepageSection (draft/published content or settings JSON), product (`images`, `videoUrl`, `ogImage`), collection (`image`, `heroMedia`, `ogImage`) or the default OG image. Upload/alt/delete go to the central `AuditLog` via `logAdminAction` (previously only `CmsAuditLog`, with a hard-coded fallback email). Asset URLs returned are always `/api/uploads/file/<name>`, never bucket URLs.
  - Limitation: the usage scan is best effort (substring match on the random filename in JSON/text fields). It does not scan order data or arbitrary external references.
  - Limitation: deleting the `MediaAsset` row does **not** delete the stored object (the storage layer has no delete method). Orphaned blobs remain.
- `/api/admin/audit` redacts metadata keys matching `/pass|secret|token|signature|authorization|hash/i` (recursive); `cms/audit` too.
- Settings/theme/SEO/policies: strict Zod (https-only social URLs, `#RRGGBB`, radius enum, ISO currency, bounded lengths). The theme API has **no free-form CSS/JS/font fields**. Settings GET returns only booleans/provider name for integrations: `RAZORPAY_KEY_ID` present, `STORAGE_PROVIDER`, and whether `S3_BUCKET_NAME`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` are all set. No secret values are ever read into a response.
- Policy markdown: server-side sanitiser (`lib/safeMarkdown.tsx`, `sanitizeMarkdown`) strips HTML comments, `<script|style|iframe|object|embed>` blocks, any tag, stray `on*=` attributes and `javascript:`/`vbscript:`/`data:` schemes. Rendering uses React text nodes only (no `dangerouslySetInnerHTML`) and links must be http(s)/mailto/tel/relative. Verified the sanitiser with a one-off script; the renderer was compile-verified only.

## Upload routes: exact behaviour

### `POST /api/upload` (customer artwork)
Before: **no authentication at all**; anyone on the internet could write up to 50MB files (including SVG and video) into storage, and no `UploadedFile` row was created, so ownership was never recorded.
Now:
- Requires a logged-in session with a user id (any role). Anonymous: 401.
- Allowlist: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Max 10MB (`Content-Length` pre-check plus post-read size check).
- Storage layer (`lib/storage/index.ts`) additionally enforces: extension denylist (`.exe .sh .php .js .html ...`), magic-byte check for JPEG/PNG/WEBP/PDF, SVG script scan (not applicable here since SVG is excluded), and generates a random 128-bit hex filename. The user-supplied name is never used for the stored path (only its extension, sanitised to `[a-zA-Z0-9._-]`).
- An `UploadedFile` row is created with `userId`.
- The storefront does not currently call this endpoint (`app/shop/[id]/page.tsx` only records the selected file name locally), so customers' custom uploads are not actually persisted yet. That wiring belongs to Agent A/C; it must use this endpoint and keep the returned `filename`/`url`.

Remaining weaknesses:
- No rate limiting; a logged-in user can upload repeatedly (10MB each). Add a per-user quota.
- `file.type` is client-declared. MIME is cross-checked only by magic bytes for four formats; GIF/AVIF/MP4/WEBM have no signature check (not allowed on this route, but allowed on the admin media route).
- The body is fully buffered in memory.

### `GET /api/uploads/file/[filename]`
Before: any **authenticated** user (including a customer) could read any file when no `UploadedFile` row existed (which was always, since nothing created rows) or when the row's `userId` was null. Anonymous visitors got 401 even for public homepage/product images stored via the admin library, which would break the storefront for logged-out users. Files stored by guessing names was impractical (128-bit names) but the authorization was effectively "any logged-in user".
Now (documented design):
1. Filename must match `^[A-Za-z0-9._-]{1,200}$` after `path.basename`.
2. If a `MediaAsset` exists with that `storageKey`: **public**, no auth. These are admin-curated storefront assets. Served with `Cache-Control: public, max-age=3600`.
3. Otherwise the caller must be an admin, or a logged-in user who owns an `UploadedFile` row for that name. Everyone else gets 401 (anonymous) or an indistinguishable **404** (unknown file or someone else's file), so there is no existence oracle. Served `private, no-store`.
4. Unregistered objects (no row in either table) are admin-only.
- Response headers: `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`, `Content-Disposition: inline`. Content type is derived from the extension of the generated name, not from the client.
- Raw bucket URLs are never returned: both storage providers return `/api/uploads/file/<name>`; objects are read server-side with `getFile`.

Remaining weaknesses:
- No HTTP `Range` support and the whole object is buffered; large videos (up to 50MB) are slow and memory-heavy and cannot be seeked on some browsers. Consider streaming or signed redirects.
- Legacy `MediaAsset` SVGs uploaded before this change (the old route allowed SVG) are scanned only by a substring blacklist (`<script`, `javascript:`, `onload=`, `onerror=`, `onclick=`); other handlers (`onmouseover=` etc.) pass. The response CSP with `sandbox` mitigates execution when opened directly, but SVG should be removed from the default storage allowlist or sanitised with a real parser.
- Admin PATCH-ing `altText` is the only metadata mutation; there is no way to rename or re-key files.

## `lib/auth.ts` review (next-auth v4)

Consistent with v4 defaults:
- JWT strategy, 24h `maxAge`, `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure` in production. Cookie names match the v4 defaults (`__Secure-next-auth.session-token`, `__Secure-next-auth.callback-url`, `__Host-next-auth.csrf-token`), so `getToken()` in middleware (which looks for the default names) works. The `__Host-` prefix is valid because the cookie is `Secure`, `path=/` and has no `Domain`.
- CSRF: next-auth v4 uses a double-submit CSRF token for its own sign-in/sign-out POSTs; that is intact. It does **not** protect custom API routes; those rely on SameSite=Lax (see general finding above).
- Middleware fails closed when `NEXTAUTH_SECRET` is unset.

Concerns:
1. **Role in JWT is never re-validated.** Role changes, demotion or deletion of an admin do not take effect until the token expires (up to 24h). `requireAdminSession()` trusts `token.role`. For an admin panel, re-check the user's role/active status from the DB in `guardAdmin()` (cheap) or shorten `maxAge`.
2. **Login rate limiter is in-process memory**, keyed only by email: lost on restart, not shared across instances/containers, and an attacker can lock a known admin email out for 15 minutes (denial of service) without knowing the password. It also counts successful logins (counter is never reset on success) and does not key on IP. Move to a DB/Redis-backed limiter keyed by email+IP, and reset on success.
3. `PrismaAdapter(prisma)` is configured together with `strategy: 'jwt'` and only a Credentials provider. The adapter is unused for sessions here; harmless, but it means no DB session revocation exists. Fine as long as concern 1 is addressed.
4. Timing: when the user does not exist, `bcrypt.compare` is skipped, so response time reveals whether an email exists (messages are generic, timing is not). Run a dummy compare for unknown users.
5. No password policy / lockout / 2FA for ADMIN accounts; a single credential factor protects write access to pricing, orders and policies.
6. The `callbacks.jwt` casts `user` to `any`; ensure `role` always comes from the DB user (it does) and never from client input.
7. `secret: process.env.NEXTAUTH_SECRET` is `undefined` if unset at runtime; next-auth v4 then throws in production for most routes, and middleware blocks `/admin`. Keep a startup check in deployment.

## What was and was not verified

- Verified: `npx prisma generate`, `npx tsc --noEmit` (clean), `npx next build --webpack` (success; all new routes appear in the route table). The default Turbopack build could not be run in this worktree because `node_modules` is a junction to the main checkout, which Turbopack rejects (environment issue, not code); the build in the main checkout should use the normal `npm run build`.
- Verified by script: the markdown sanitiser output for script/img-onerror/javascript: payloads and `isSafeUrl` for `java<TAB>script:` and https URLs.
- **Not verified**: any database interaction (seed-on-read policies, upserts, audit union query with distinct, `createMany skipDuplicates`), any HTTP request/response status, UI behaviour in a browser, S3/R2 storage paths. There is no local PostgreSQL.
