# ADR-008: Background jobs and timers — DB deadlines + minute sweeper, BullMQ for work
Date: 2026-09-28 | Status: proposed

## Context
- Business timers (spec 00 §4.4–4.9): auto-release after delivery (S-025/S-026, 72h, ON), award acceptance (S-027, 48h), refund auto-reject (S-030, 2 days), custom-offer expiry (S-036, 3 days), subscription renewal (S-042) and renewal reminder 3 days before (S-043/S-044), availability reset (BR-013), plus technical jobs (email/push sending, upload scanning, BOG reconciliation, ledger reconciliation, analytics rollups, cleanup, backups).
- Timer semantics decided by the Owner: revision request, open refund request or dispute stops the auto-release (Q-061b, Q-067c); after re-delivery **a fresh full 72h** starts (Q-071a); after a refund request ends without money moving, a fresh full period starts from that moment (Q-071b); after a dispute the admin decides and no timer restarts (Q-071c); timers already running keep the deadline computed at delivery when the setting changes (EC-2); switching auto-release OFF stops automatic releases immediately (EC-3); auto-release applies to gig orders, project payments and custom offers (Q-067a).
- Legacy: crons that are not scheduled (`orders:complete`, `expired:projects`, R-031), wrong windows, 24h vs 48h (R-032), public HTTP cron endpoints `/tasks/queue`, `/tasks/schedule` (R-011), sitemap regenerated every minute (R-042), renewals every minute tied to a session (R-041).

## Decision
1. **Deadlines are data.** Each timer is an absolute timestamp column on the business row, set in the same transaction as the event that starts it:
   - `escrow.auto_release_at` (nullable). Set to `delivered_at + S-026 hours` (value read at that moment and stored as `auto_release_hours_used`) on delivery and re-delivery; set to `NULL` with `auto_release_paused_reason` on revision request, refund request or dispute; set to `now + S-026` when a refund request ends without money moving; stays `NULL` after a dispute (admin decision).
   - `project_award.expires_at`, `refund.seller_deadline_at`, `custom_offer.expires_at`, `subscription.renewal_reminder_at` (+ `reminder_sent_period`), `subscription.ends_at` (+ `renewal_attempted_period`), `user.unavailable_until`.
   This stores a restart timestamp, not "remaining seconds", which matches Q-071 (fresh period). If the Owner ever wants "remaining time", the paused row would also store remaining seconds; the design allows adding that column.
2. **Sweeper.** The worker runs one repeatable BullMQ job per timer type every minute. Each run selects due rows with `SELECT … WHERE deadline <= now() AND <state still valid> ORDER BY deadline LIMIT n FOR UPDATE SKIP LOCKED`, and for each row performs the domain action through the **same service method** a user/admin action would use (e.g. `EscrowService.release(id, actor = system)`), inside one transaction with compare-and-set state checks and ledger idempotency refs (ADR-003). Multiple workers can run safely; a crash mid-run simply leaves rows for the next minute.
3. **Global toggles are checked at execution.** The auto-release sweeper does nothing while S-025 is OFF (EC-3). When S-025 is switched back ON, rows whose `auto_release_at` is in the past are released at the next run — **flagged for Owner confirmation** in the handoff (alternative: recompute deadlines from the moment the toggle is turned ON).
4. **BullMQ queues for work, not for business deadlines.** Queues: `email`, `push`, `in-app-realtime`, `files-scan`, `bog-reconcile`, `ledger-reconcile`, `analytics`, `maintenance`, later `ai-translate`. Each job has retries with exponential backoff and a dead-letter state visible in the admin queue dashboard (`system.queues.read`). Jobs are idempotent (they carry the business id; handlers check state).
5. **Schedules** (worker only, UTC):
   | Job | Schedule |
   |---|---|
   | Timer sweepers (auto-release, award expiry, refund auto-reject, offer expiry, renewal reminder, renewal charge) | every minute |
   | BOG reconciliation of pending intents | every 5 minutes |
   | Availability reset (BR-013) | daily |
   | Ledger reconciliation (ADR-003) | nightly |
   | Analytics rollups (ADR-012) | hourly + nightly |
   | Cleanup: expired 2FA challenges, idempotency keys (24h), temporary quarantine uploads, old `system_log` rows (30 days) | nightly |
   | Database backup (ADR-015) | nightly (legacy: monthly) |
   | GeoIP database update | weekly |
6. **Sitemap is not a job.** `/sitemap.xml` (index) and its parts are Next.js route handlers that read keyset-paginated data from the API and are cached for 1 hour (ISR); content changes can revalidate them. No per-minute regeneration (R-042). If the data grows past what request-time generation can handle, a nightly job can write sitemap files to object storage without changing URLs.
7. **No HTTP trigger** for queues, schedules, migrations or maintenance exists (R-010, R-011). Staff actions like "retry failed job" go through authenticated admin endpoints with permission `system.queues.write`.
8. **Monitoring.** Each sweeper records its last successful run; the readiness check and an admin alert fire if a sweeper has not run for 5 minutes (fixes the silent "cron not scheduled" class of bugs, R-031).
9. **Time.** Deadlines are stored in UTC; durations are in hours/days from the register, so they do not depend on time zones or daylight saving.

## Alternatives considered
- **One delayed BullMQ job per deadline** — precise to the second, but jobs must be found and cancelled on pause, re-created on restart, and can be lost if Redis data is lost; changing settings would leave stale jobs. Rejected as the source of truth (still fine for short technical delays).
- **Cron inside the API HTTP process (`@nestjs/schedule`)** — runs N times with N API instances and competes with request handling. Rejected; scheduling lives only in the worker.
- **PostgreSQL `pg_cron`** — keeps business code in SQL. Rejected.
- **Temporal / workflow engine** — powerful for long-running flows, too heavy for one Owner.

## Consequences
- Easier: timers survive restarts and Redis loss; pausing/restarting is a column update; every timer action reuses the same tested service method as the manual action; up to one minute of delay is acceptable for hour/day timers.
- Harder: every timer needs an index on its deadline column and a clear "still valid" condition.
- Must change: data-model.md adds the deadline columns and indexes; specs 06, 11, 12, 13 reference these fields' behaviour; spec 16 shows queue/sweeper health.
