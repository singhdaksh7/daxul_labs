# Stock reservations and expiry

create-order reserves stock immediately (variant stock where a selected variant tracks its own stock,
otherwise product stock when `trackInventory`). Only **unpaid prepaid** orders get a timer:

- `Order.reservationExpiresAt = now + SiteSettings.reservationMinutes` (default 60, admin range 10..10080).
- COD orders, paid orders and zero-total orders have no expiry and keep their stock.
- Successful payment (verify-payment or webhook) clears `reservationExpiresAt`.

## Release job

`releaseExpiredReservations(now)` (`lib/reservations.ts`) selects prepaid / pending / not cancelled /
expired / `stockReleasedAt IS NULL` orders. Per order, in one transaction, it claims the order with an
`updateMany` that re-checks all of those conditions and sets `stockReleasedAt` + `status='cancelled'`.
Only when the claim count is exactly 1 does it restore stock (mirroring what create-order decremented),
write `InventoryAdjustment` rows (`reason='reservation_released'`), release the coupon use, add an
`OrderStatusHistory` note ("Reservation expired - stock released") and an `AuditLog` row (actor `system`).
Concurrent runners cannot double-release.

### Payment arriving for an already released order

`markOrderPaid` never loses a payment. If the order was released, it is marked paid and the stock is
re-reserved with guarded decrements. If stock is no longer available the order is set to status `new`
with an `ATTENTION` line in `internalNotes`, a history note and a `LATE_PAYMENT_NEEDS_ATTENTION` audit
row so staff can fulfil or refund.

## Triggers

1. `POST /api/internal/release-reservations` with `Authorization: Bearer $CRON_SECRET`
   (503 when `CRON_SECRET` is unset on the server, 401 on a wrong token).
2. Opportunistic: create-order and admin orders GET call it at most once per minute per process
   (errors swallowed).

## Scheduling from the VPS host cron

The app container has no published host port (only Traefik reaches it), so the job calls the endpoint
**from inside the container**. The secret lives only in the VPS `.env` (passed to the container by
`docker-compose.yml`); the cron line never contains or reads it.

1. On the VPS, add `CRON_SECRET=<long random value>` to `/opt/daxul_labs/.env` (e.g. paste the output of
   `openssl rand -hex 32` yourself) and run `docker compose up -d app` so the container picks it up.
2. Install the cron entry for the deploy user (`crontab -e`), every 5 minutes:

```
*/5 * * * * /opt/daxul_labs/scripts/release-reservations-cron.sh >> "$HOME/daxul-release.log" 2>&1
```

`scripts/release-reservations-cron.sh` runs `wget` inside `daxul_labs_app`, sends
`Authorization: Bearer $CRON_SECRET` (read from the container's own environment), and logs only a
timestamp, the HTTP outcome and the `{"ok":true,"released":N,"failed":M}` counts - never the secret.
