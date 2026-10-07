#!/bin/bash
# Calls the stock-reservation release endpoint from inside the app container.
# The secret is read from the container's own environment and is never printed.
set -u
cd /opt/daxul_labs || exit 1
TS=$(date -u +%FT%TZ)
OUT=$(docker exec daxul_labs_app sh -c '
  [ -n "$CRON_SECRET" ] || { echo "NO_SECRET"; exit 3; }
  wget -q -T 30 -O - --header="Authorization: Bearer $CRON_SECRET" --post-data="" \
    http://localhost:3000/api/internal/release-reservations
' 2>&1)
RC=$?
if [ $RC -eq 0 ]; then
  echo "$TS ok $OUT"
elif [ "$OUT" = "NO_SECRET" ]; then
  echo "$TS skipped: CRON_SECRET not configured"
else
  echo "$TS failed rc=$RC (auth/endpoint error)"
fi
