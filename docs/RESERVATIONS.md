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

Set `CRON_SECRET` in the app's environment (not in the repo). On the host keep the secret in a root-only
file, e.g. `/etc/daxul/cron.env` (`chmod 600`) containing `CRON_SECRET=...`, then add to `crontab -e`:

```
*/5 * * * * . /etc/daxul/cron.env && curl -fsS -m 30 -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/internal/release-reservations >/dev/null 2>>/var/log/daxul-release.log
```

Use the internal address/port the app listens on; do not route it through a public URL if you can avoid it.
The response is `{"ok":true,"released":N,"failed":M}`.
