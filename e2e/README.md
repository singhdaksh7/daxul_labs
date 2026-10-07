# DAXUL production QA (Playwright)

Browser-level QA for the DAXUL storefront + Studio OS admin, run **against a deployed base URL**. It never touches the
database directly and never changes application code. Everything it creates is tagged `QA-<timestamp>` and cleaned up
by `15-cleanup`.

## Run

```bash
npm ci
npx playwright install chromium            # once per machine

# on the VPS (creates a temporary ADMIN user; password never printed)
cd /opt/daxul_labs && bash scripts/qa-admin/provision.sh

# from the machine that runs the browser
set -a; . ~/.daxul-qa/creds.env; set +a    # QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD (never cat this file)
export BASE_URL=https://<production-host>
npm run qa:e2e                             # = playwright test -c e2e/playwright.config.ts
npx playwright show-report e2e/report      # HTML report

# afterwards, on the VPS
bash scripts/qa-admin/cleanup.sh
```

`npm run qa:e2e:list` lists the tests without running anything (no env needed).
Run a single spec: `npm run qa:e2e -- 06-manufacturing`.
If a run aborts before `15-cleanup`, the next run refuses to start; finish with
`QA_RESUME=1 npm run qa:e2e -- 15-cleanup` (re-uses the saved run tag, state and originals).

### Environment (read from `process.env` only)
| var | meaning |
| --- | --- |
| `BASE_URL` | e.g. `https://daxullabs.com` |
| `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD` | the temporary admin from `provision.sh` |
| `QA_RESUME=1` | re-use run tag/state/originals (cleanup re-run) |
| `QA_CMS_PUBLIC_LIVE_TOGGLE=0` | skip waiting for the *public* storefront to reflect the (briefly live) section hide in 08 |

### Secret handling
* Tracing, video and automatic screenshots are **off** (`playwright.config.ts`). The only screenshots are explicit, taken
  by `14-mobile` for non-login pages, into `e2e/screenshots/` (git-ignored).
* `global-setup.ts` logs in through the NextAuth credentials endpoint with no browser, and stores the session in
  `e2e/.auth/admin.json` (git-ignored). The one UI login (`01-auth`) fills the password with `secureFill()`
  (native value setter) so the value does not appear in Playwright's action log. Errors are passed through `redact()`.
* Login attempts are rate limited per email (5 / 15 min): a full run uses 2 logins for the QA admin; the invalid-login
  check uses a non-existent address on purpose.
* `e2e/.auth`, `.state`, `report`, `test-results`, `screenshots` are git-ignored (`e2e/.gitignore`).

## Specs (run in order, 1 worker)
| spec | covers |
| --- | --- |
| `01-auth` | unauthenticated `/admin` -> `/admin/login?callbackUrl=`, admin API rejected, invalid login message, valid login, Sign out |
| `02-dashboard` | loads, labelled stat cards, no NaN/undefined/fake copy, empty states, every sidebar link resolves |
| `03-products` | create `DAXUL TEST OBJECT <tag>` via UI (price, stock, `Size` group with +price variant, required text field with fee, required select field), edit, listed |
| `04-storefront` | in /shop and /shop/<slug>, variant price, required-field validation blocks add-to-cart, cart total == server quote, cart persists on reload, checkout reaches the payment step (stops before Place Order; all `*.razorpay.com` aborted) |
| `05-orders` | COD rejected for customizable product, tampered totals rejected, pending prepaid order via `POST /api/razorpay/create-order` (no charge), shows in `/admin/orders` with quote total, customization visible in detail |
| `06-manufacturing` | UI walk through every status, illegal moves rejected (UI + API), history timeline, courier+tracking, SHIPPED, `/api/track` (wrong info / number only / matching), cancel |
| `07-collections` | create QA collection + assign product, 2nd collection, reorder up/down + restore, archive, storefront visibility |
| `08-cms` | all 8 sections: edit marker, Save Draft (public unchanged), Publish (public shows), restore + byte-for-byte equality with the pre-test capture, visibility toggle, reorder, mobile preview, audit entries |
| `09-policies` | edit `returns` with marker (+ raw HTML stripped), public page, exact restore |
| `10-settings-theme-seo` | support hours + announcement text, theme accent/radius CSS vars, Reset to DAXUL default, SEO `<title>`, all restored |
| `11-coupons` | percentage + fixed, quote math, expired/future/unknown, validation, usage limit (consumed by a pending order), disable, delete |
| `12-inventory` | +N adjustment with reason, ledger row, low threshold -> `low` + dashboard alert, opposite adjustment |
| `13-customers-analytics-audit` | customers (QA customer, LTV excludes unpaid), analytics sanity, media upload, audit coverage + no secrets |
| `14-mobile` | 390/430/768/1440: no horizontal overflow, key controls visible/clickable, screenshots (soft assertions: every page is reported) |
| `15-cleanup` | cancel orders, archive product, delete/disable coupons, archive collections, delete media, assert settings/policies/theme/SEO/CMS/collections/catalog equal `e2e/.state/original.json` |

## Gaps / things that cannot be done through the UI as written (nothing is faked with SQL)
1. **`POST /api/quote` does not exist** in the code base this was written against (price calculation lives in
   `lib/pricing.ts`, used by `create-order`). `helpers.quote()` tries `/api/quote` first; on 404/405 it falls back to
   `POST /api/razorpay/create-order` with a deliberately wrong `expectedTotal`, which the server rejects with
   `400 { serverTotal }` *before* creating any order, reserving stock or consuming a coupon. The spec annotation
   `quote-source` records which path was used. If `/api/quote` exists on the deployment, its response must expose the
   total as `total`, `totalAmount`, `grandTotal`, `quote.total` or `data.total`.
2. **Illegal status "jump" is not possible from the UI** (only Back/Advance single steps). The UI-reachable illegal
   transition (SHIPPED without courier/tracking) is tested in the UI; jumps and malformed moves are tested against
   `PATCH /api/admin/orders`.
3. **COD and real payment are not exercised.** The test product is customizable (COD blocked by design), and no spec
   opens Razorpay, calls `verify-payment` or the webhook. The order stays `pending`/unpaid, so dashboard revenue and
   customer LTV are unaffected (asserted).
4. **Hard deletes are impossible by design**, so data remains after cleanup: the order(s) are *cancelled* (not removed),
   the product is *archived*, collections are *archived* (no delete exists), the usage-limit coupon is *disabled*
   (used coupons cannot be deleted), and the derived customer `qa-customer-*@daxul.invalid` stays visible in
   Customers. Stock reserved by the test orders is not returned on cancel (app behaviour) but only affects the archived
   test product. The `AuditLog` rows of the QA admin are intentionally kept.
5. **The public home page HTML does not contain CMS content** (the storefront fetches `/api/cms/published` client side),
   so "public unchanged / shows marker" is asserted on `/api/cms/published` (polled: it is cached ~60 s) and, for
   information only, on the rendered DOM (annotation `cms-not-rendered-on-home` when a field is published but not shown).
6. **CMS publish, visibility toggle and reorder are live on production** while the test runs (seconds to ~2 min).
   Sections that already carry an unpublished draft, or are hidden, are skipped (annotation `cms-skipped`) because
   publishing would publish someone else's pending draft. An `afterAll` safety net restores any section still holding a
   marker.
7. **Restore equality caveats**: the admin forms save `null` as `""` (compared with null == ""). A policy that had no
   `StorePolicy` row yet (default text) will have a row with identical content afterwards. If the UI round trip of a CMS
   field is not byte-identical the spec restores via the same admin API and annotates `cms-restore-note`.
8. Not covered: photo/file customization upload (`/api/upload`), media picker modal, video media, collection/product
   SEO fields, product duplicate/feature actions, order notes and payment-status changes, `/account`, customer-facing
   COD flow, sitemap/robots, email sending.
9. `14-mobile` uses soft assertions on purpose; the site editor (3-pane layout) is the most likely page to report
   overflow below 1024 px.

## Selectors that could not be verified against a running app
All locators were derived by reading `app/admin/(studio)/**`, `components/admin/**`, `app/shop`, `app/checkout`,
`components/CartDrawer.tsx`. No database exists locally, so only the login page flow was exercised live against
`next dev` (redirect, `callbackUrl`, invalid-login alert, admin API rejection). Everything below is source-derived only:

* Admin product editor: variant Name/SKU by placeholder `Name`/`SKU`; the +price input is the first number input in
  the variant row; custom fields addressed positionally (`Label` placeholder indexes 0/1 = fields, 2/3 = choices;
  `Fee ₹`, `Placeholder`, `Required` by index; the type `<select>` is found by its `textarea` option).
* Site editor: inputs are located as the `<input>` following a `<label>` with the exact text (labels are not associated
  via `for`); section cards via the `sectionKey` span; `Toggle Visibility` / `Move Up` / `Move Down` by `title`.
* Collections list: row buttons are icon-only; positions 0/1/2 = up/down/archive. Products list: `title="Archive"`.
* Coupons: form fields by order (number inputs: value, min, usage limit; date inputs: start, expiry); `Edit`,
  `Delete`/`Disable` text buttons per row.
* Order detail: totals read from the `Amount` panel `dt`/`dd` rows; history from the `Status history` section.
* Cart drawer located by `div[class*="z-[90]"]`; product price by `div.text-2xl.font-black`; checkout fields by the
  uppercase label text. Media tile by its `<img alt>` (filename).
* Dashboard/inventory/analytics numbers are checked for finiteness only, not exact values.
* `/shop/<slug>` of an archived product is asserted to be 404 (15-cleanup); if the storefront intentionally serves
  archived products, relax that assertion.
