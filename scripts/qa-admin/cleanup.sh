#!/usr/bin/env bash
# Remove the temporary QA admin created by provision.sh.
#
# Run ON THE VPS:   cd /opt/daxul_labs && bash scripts/qa-admin/cleanup.sh [--email <qa-playwright-...@daxul.invalid>] [--all]
#
#  - deletes the QA user (and its LoginAttempt rows, accounts, sessions)
#  - shreds/removes ~/.daxul-qa/creds.env
#  - verifies the user count for that email is 0 and the creds file is gone (non-zero exit otherwise)
#  - ONLY ever touches users matching  qa-playwright-<12 hex>@daxul.invalid ; real users are never selected
#  - AuditLog rows written by the QA admin are intentionally KEPT (they are the evidence of what the QA run did)
#
#   (default)  email is read from ~/.daxul-qa/creds.env
#   --email    use this address instead (creds file lost)
#   --all      delete every user matching the QA pattern (leftovers from --force provisions)
set -euo pipefail
set +x
umask 077

APP_DIR="${DAXUL_DIR:-/opt/daxul_labs}"
SERVICE="${DAXUL_APP_SERVICE:-app}"
CRED_DIR="${HOME}/.daxul-qa"
CRED_FILE="${CRED_DIR}/creds.env"
EMAIL=""
ALL=0
PATTERN='^qa-playwright-[0-9a-f]{12}@daxul\.invalid$'

while [ $# -gt 0 ]; do
  case "$1" in
    --email) EMAIL="${2:-}"; shift 2 ;;
    --all) ALL=1; shift ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

cd "$APP_DIR" || { echo "Cannot cd to $APP_DIR" >&2; exit 2; }
docker compose ps --status running --services 2>/dev/null | grep -qx "$SERVICE" \
  || { echo "Service '$SERVICE' is not running (docker compose ps)" >&2; exit 2; }

if [ "$ALL" -ne 1 ] && [ -z "$EMAIL" ]; then
  if [ -f "$CRED_FILE" ]; then
    # read ONLY the email line; the password line is never read into a variable here
    EMAIL="$(grep -m1 '^QA_ADMIN_EMAIL=' "$CRED_FILE" | cut -d= -f2- | tr -d '\r\n')"
  fi
fi
if [ "$ALL" -ne 1 ]; then
  if [ -z "$EMAIL" ]; then
    echo "No creds file and no --email given; nothing to delete (use --all to sweep leftovers)." >&2
  elif ! printf '%s' "$EMAIL" | grep -Eq "$PATTERN"; then
    echo "REFUSING: '$EMAIL' does not match the QA pattern; this script only deletes qa-playwright-*@daxul.invalid users." >&2
    exit 3
  fi
fi

CLEAN_JS='
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const PATTERN = /^qa-playwright-[0-9a-f]{12}@daxul\.invalid$/;
(async () => {
  let buf = "";
  process.stdin.setEncoding("utf8");
  for await (const c of process.stdin) buf += c;
  const { email, all } = JSON.parse(buf);
  const prisma = new PrismaClient();
  try {
    let emails = [];
    if (all) {
      const rows = await prisma.user.findMany({ where: { email: { startsWith: "qa-playwright-", endsWith: "@daxul.invalid" } }, select: { email: true } });
      emails = rows.map((r) => r.email.toLowerCase()).filter((e) => PATTERN.test(e));
    } else if (email) {
      if (!PATTERN.test(email)) throw Object.assign(new Error("bad"), { code: "BAD_EMAIL" });
      emails = [email.toLowerCase()];
    }
    let deletedUsers = 0, deletedAttempts = 0;
    for (const e of emails) {
      const keys = [e, crypto.createHash("sha256").update(e).digest("hex")];
      if (prisma.loginAttempt) {
        const r = await prisma.loginAttempt.deleteMany({ where: { emailKey: { in: keys } } });
        deletedAttempts += r.count;
      }
      const u = await prisma.user.findUnique({ where: { email: e }, select: { id: true, email: true } });
      if (!u) continue;
      if (!PATTERN.test(u.email.toLowerCase())) continue; // belt and braces
      if (prisma.session) await prisma.session.deleteMany({ where: { userId: u.id } });
      if (prisma.account) await prisma.account.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
      deletedUsers += 1;
    }
    let remaining = 0;
    for (const e of emails) remaining += await prisma.user.count({ where: { email: e } });
    console.log("deleted_users=" + deletedUsers + " deleted_login_attempts=" + deletedAttempts + " remaining_users_for_targeted_emails=" + remaining);
    await prisma.$disconnect();
    process.exit(remaining === 0 ? 0 : 4);
  } catch (e) {
    console.error("ERROR:" + ((e && e.code) || (e && e.name) || "unknown"));
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
'

STATUS=0
if [ "$ALL" -eq 1 ] || [ -n "$EMAIL" ]; then
  printf '{"email":"%s","all":%s}' "$EMAIL" "$([ "$ALL" -eq 1 ] && echo true || echo false)" \
    | docker compose exec -T "$SERVICE" node -e "$CLEAN_JS" || STATUS=$?
fi

# ------------------------------------------------------------- creds file
if [ -e "$CRED_FILE" ]; then
  if command -v shred >/dev/null 2>&1; then shred -u -n 3 "$CRED_FILE" 2>/dev/null || rm -f "$CRED_FILE"; else rm -f "$CRED_FILE"; fi
fi
find "$CRED_DIR" -maxdepth 1 -name '.creds.*' -type f -exec rm -f {} + 2>/dev/null || true
rmdir "$CRED_DIR" 2>/dev/null || true

# ------------------------------------------------------------ verification
FAIL=0
if [ -e "$CRED_FILE" ]; then echo "VERIFY FAILED: $CRED_FILE still exists" >&2; FAIL=1; else echo "verified: creds file is gone"; fi

if [ "$ALL" -eq 1 ]; then
  VERIFY_JS='const {PrismaClient}=require("@prisma/client");(async()=>{const p=new PrismaClient();try{console.log(await p.user.count({where:{email:{startsWith:"qa-playwright-",endsWith:"@daxul.invalid"}}}))}finally{await p.$disconnect()}})();'
  LEFT="$(docker compose exec -T "$SERVICE" node -e "$VERIFY_JS" | tr -dc '0-9')"
elif [ -n "$EMAIL" ]; then
  LEFT="$(printf '%s' "$EMAIL" | docker compose exec -T "$SERVICE" node -e '
const {PrismaClient}=require("@prisma/client");
(async()=>{let b="";process.stdin.setEncoding("utf8");for await(const c of process.stdin)b+=c;
const p=new PrismaClient();try{console.log(await p.user.count({where:{email:b.trim().toLowerCase()}}))}finally{await p.$disconnect()}})();' | tr -dc '0-9')"
else
  LEFT=0
fi
if [ "${LEFT:-1}" = "0" ]; then echo "verified: QA user count is 0"; else echo "VERIFY FAILED: ${LEFT:-unknown} QA user(s) remain" >&2; FAIL=1; fi

if [ "$STATUS" -ne 0 ]; then echo "Deletion step exited with status $STATUS" >&2; FAIL=1; fi
exit "$FAIL"
