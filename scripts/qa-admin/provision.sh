#!/usr/bin/env bash
# Provision ONE temporary QA admin for the Playwright production suite.
#
# Run ON THE VPS:   cd /opt/daxul_labs && bash scripts/qa-admin/provision.sh [--force]
#
#  - generates a random 32-char password with openssl (never printed, never put on a command line)
#  - creates ONE user  qa-playwright-<random>@daxul.invalid  with role ADMIN
#    (bcryptjs cost 12 + the app's Prisma client, run inside the running `app` container;
#     the password reaches the container over STDIN, so it is not visible in `ps`)
#  - writes QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD ONLY to ~/.daxul-qa/creds.env (mode 600, dir 700)
#  - prints only the file path and that the user row exists
#  - refuses to run if any user whose email starts with "qa-" exists, or the creds file exists, unless --force
#    (--force never deletes anything; use scripts/qa-admin/cleanup.sh for that)
#  - never reads, modifies or deletes non-QA users
set -euo pipefail
set +x
umask 077

APP_DIR="${DAXUL_DIR:-/opt/daxul_labs}"
SERVICE="${DAXUL_APP_SERVICE:-app}"
CRED_DIR="${HOME}/.daxul-qa"
CRED_FILE="${CRED_DIR}/creds.env"
FORCE=0

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

command -v openssl >/dev/null || { echo "openssl is required" >&2; exit 2; }
cd "$APP_DIR" || { echo "Cannot cd to $APP_DIR" >&2; exit 2; }
docker compose ps --status running --services 2>/dev/null | grep -qx "$SERVICE" \
  || { echo "Service '$SERVICE' is not running (docker compose ps)" >&2; exit 2; }

# ---------------------------------------------------------------- pre-checks
if [ -e "$CRED_FILE" ] && [ "$FORCE" -ne 1 ]; then
  echo "REFUSING: $CRED_FILE already exists. Run scripts/qa-admin/cleanup.sh first (or pass --force)." >&2
  exit 3
fi

PRECHECK_JS='
const { PrismaClient } = require("@prisma/client");
(async () => {
  const prisma = new PrismaClient();
  try {
    const n = await prisma.user.count({ where: { email: { startsWith: "qa-", mode: "insensitive" } } });
    console.log(String(n));
  } catch (e) { console.error("ERROR:" + ((e && e.code) || (e && e.name) || "unknown")); process.exit(1); }
  finally { await prisma.$disconnect(); }
})();
'
EXISTING="$(docker compose exec -T "$SERVICE" node -e "$PRECHECK_JS")" || { echo "Could not query the user table" >&2; exit 1; }
EXISTING="$(printf '%s' "$EXISTING" | tr -dc '0-9')"
if [ "${EXISTING:-0}" -gt 0 ] && [ "$FORCE" -ne 1 ]; then
  echo "REFUSING: ${EXISTING} user(s) with a qa- email prefix already exist. Run scripts/qa-admin/cleanup.sh, or pass --force." >&2
  exit 3
fi

# ------------------------------------------------------------ generate secrets
# alphanumeric only => safe in env files and JSON; >= 24 chars guaranteed by the length check
PW="$(openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 32)"
[ "${#PW}" -ge 24 ] || { echo "Password generation failed" >&2; exit 1; }
EMAIL="qa-playwright-$(openssl rand -hex 6)@daxul.invalid"

mkdir -p "$CRED_DIR"
chmod 700 "$CRED_DIR"
TMP_FILE="$(mktemp "${CRED_DIR}/.creds.XXXXXX")"
trap 'rm -f "$TMP_FILE" 2>/dev/null || true; unset PW' EXIT
{
  printf 'QA_ADMIN_EMAIL=%s\n' "$EMAIL"
  printf 'QA_ADMIN_PASSWORD=%s\n' "$PW"
} > "$TMP_FILE"
chmod 600 "$TMP_FILE"

# ------------------------------------------------------------------ create user
CREATE_JS='
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
(async () => {
  let buf = "";
  process.stdin.setEncoding("utf8");
  for await (const c of process.stdin) buf += c;
  const { email, password } = JSON.parse(buf);
  const prisma = new PrismaClient();
  try {
    if (!/^qa-playwright-[0-9a-f]{12}@daxul\.invalid$/.test(email)) throw Object.assign(new Error("bad"), { code: "BAD_EMAIL" });
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { email, name: "QA Playwright (temporary)", passwordHash, role: "ADMIN" } });
    const n = await prisma.user.count({ where: { email, role: "ADMIN" } });
    console.log("admin_rows_for_new_email=" + n);
    await prisma.$disconnect();
    process.exit(n === 1 ? 0 : 4);
  } catch (e) {
    console.error("ERROR:" + ((e && e.code) || (e && e.name) || "unknown"));
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
'
# password travels over stdin (printf is a shell builtin: not in the process list)
if ! printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PW" | docker compose exec -T "$SERVICE" node -e "$CREATE_JS"; then
  echo "User creation FAILED; no credentials file was written." >&2
  exit 1
fi

mv -f "$TMP_FILE" "$CRED_FILE"
chmod 600 "$CRED_FILE"
trap 'unset PW' EXIT

echo "OK: temporary QA admin created (1 user, role ADMIN)."
echo "Credentials file (mode 600): $CRED_FILE"
echo "Use:  set -a; . \"$CRED_FILE\"; set +a   (do NOT cat the file into logs)"
echo "When finished run: bash scripts/qa-admin/cleanup.sh"
