# Next security enhancement: TOTP / passkey 2FA for admins (design note, NOT implemented)

## Why
Admin accounts control pricing, orders and policies behind a single password. After the DB-backed role check and login throttling, a second factor is the largest remaining reduction in account-takeover risk.

## Scope
ADMIN and SUPER_ADMIN only (customers do not log in). Enforced for every admin sign-in; SUPER_ADMIN can reset another admin's factors.

## Data model (needs a migration; the schema is frozen in this phase)
- `AdminCredential`: `id`, `userId` FK, `type` (`TOTP` | `PASSKEY`), `label`, `secretEnc` (TOTP secret encrypted with an app key, AES-256-GCM, never stored in clear), `credentialId` + `publicKey` + `counter` (WebAuthn), `lastStep` (TOTP replay guard), `createdAt`, `lastUsedAt`, `revokedAt`.
- `AdminRecoveryCode`: `userId`, `codeHash` (bcrypt/argon2), `usedAt`. 10 single-use codes shown once at enrolment.
- `User.mfaEnabledAt` (nullable) to drive enforcement.

## Flow
1. Password step (existing `authorize` with its throttling). With MFA enabled, return a short-lived (5 min), single-purpose "pre-auth" token (signed, `purpose=mfa`, bound to userId + IP hash), not a session.
2. Second step at `/admin/login/verify`: TOTP code, WebAuthn assertion or recovery code. Rate limited with the same PostgreSQL limiter (new dimension `mfa:<userId>`), 5 failures / 15 min.
3. On success issue the normal next-auth JWT with `mfa: true` and `mfaAt`. `requireAdminSession()` (already hitting the DB on each request) additionally requires that an admin with `mfaEnabledAt` has `token.mfa === true`; otherwise redirect to enrolment.
4. Step-up: sensitive actions (role changes, settings, coupon deletes, media purge) require `mfaAt` within the last 15 minutes, else 401 with `code: 'STEP_UP'`.

## TOTP
RFC 6238, SHA-1, 6 digits, 30 s step, accept +-1 step, reject reuse of the same time-step per credential. Enrolment shows an `otpauth://` QR and activates the factor only after one valid code.

## Passkeys
WebAuthn via `@simplewebauthn/server`, `userVerification: 'required'`, RP ID = production domain, challenge stored server-side (5 min TTL), verify origin, RP ID and counter. Several passkeys per admin; passkeys can later replace the password step (phishing-resistant).

## Recovery / lockout
Recovery codes, plus a SUPER_ADMIN reset that revokes all credentials and is audit-logged (`MFA_RESET`). Break-glass: a documented CLI script run on the server with DB access (never an HTTP endpoint).

## Audit
`MFA_ENROLLED`, `MFA_REMOVED`, `MFA_FAILED` (count only, never codes), `MFA_RECOVERY_USED`, `MFA_RESET` via `logAdminAction`.

## Rollout
1. Ship tables and an optional enrolment UI. 2. Enforce for SUPER_ADMIN. 3. Enforce for all admins after a grace period. Test the verifier and limiter with mocked prisma like the current suite.
