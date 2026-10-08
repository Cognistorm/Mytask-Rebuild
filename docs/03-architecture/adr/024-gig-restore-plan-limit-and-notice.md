# ADR-024: Restoring a staff-removed gig — plan limit and owner notice
Date: 2026-10-07 | Status: **accepted** (architect, ROADMAP 4.3.2a; business rule decided by the Owner, Q-123 (b), 2026-10-07) | Amends: contract 1.4.0 → **1.5.0** (additive), data model §3.D, spec 15 (NEW EV-130), spec 16 AC-20

## Context
- Spec 16 AC-20 (P-117): staff can "Remove" an active gig with an internal reason (it becomes deleted like an owner deletion) and "Restore" it within 30 days. Contract `adminRestoreGig` returned the gig to `active` and left the plan limit, re-moderation and notification open as slice item Q-123 (default: no limit check, no notification).
- Legacy restores silently from the trash without any check (`legacy/APP/app/Livewire/Admin/Gigs/Trash/TrashComponent.php:113-122`). Legacy admin delete is a Laravel soft delete that keeps the status (`Admin/Gigs/GigsComponent.php:187`); owner delete sets `status = deleted` (`Main/Seller/Gigs/GigsComponent.php`).
- A removed gig no longer counts toward the plan limit (spec 04 R-G3). While it is removed, a Standard owner may create a new gig in the freed slot, so a silent restore could put the owner above the limit, which spec 00 R-2.3 only allows for gigs that existed when a plan ended.
- `AdminGig` already exposes `deletedBy`, `removalReason`, `removedAt`, `restoreDeadlineAt` and `submittedAt`, but data-model §3.D and the 4.2.2b migration had no columns for them (4.3.1 handoff §B).
- **Owner answer 2026-10-07, Q-123 (b):** check the owner's plan limit and notify the owner (NEW event).

## Decision
1. **Restore rule.** `adminRestoreGig` (staff removals only, within 30 days of `deleted_at`) counts the owner's non-deleted gigs with the same rule as `createGig` (S-001 Standard / S-002 Premium by the owner's current plan, through the `PremiumStatus` seam). If the count already reaches the limit → `422 PLAN_LIMIT_REACHED` with `details.limit` and `details.settingId`; the admin shows `t_admin_gig_restore_plan_limit`. The count and the status change run in one transaction with the owner's gig-count lock used by `createGig`, so a create and a restore cannot both take the last slot.
2. **Status.** The gig returns to `active` (the only status a staff removal can start from), also while S-070 is OFF: its content did not change, so there is nothing to re-moderate. `deleted_at`, `deleted_by`, `deleted_by_staff_id` and `removal_reason` are cleared; `published_at` is kept; `SearchIndex.indexGig` runs in the same transaction.
3. **Notice.** On success the owner gets **EV-130** `GigRestored` — email `t_subject_gig_restored` / `t_gig_restored_email_body`, in-app `t_ur_gig_title_has_been_restored`, push (P-11) — linking to the gig page; category T (transactional), SMS-ready OFF. Written to the outbox in the restore transaction (spec 15 R-N2). Texts in spec 16 (en + ka).
4. **Data model** (§3.D): `gigs.deleted_by gig_deleted_by null` (`owner`, `staff`), `deleted_by_staff_id uuid null FK→staff`, `removal_reason varchar(1000) null`, `submitted_at timestamptz null`, with check constraints tying them to `status = 'deleted'`. `restoreDeadlineAt` is computed (`deleted_at + 30 days`). Legacy soft-deleted rows without `status = deleted` migrate as `deleted_by = staff` (§12.2).
5. **Contract 1.5.0:** `adminRestoreGig` description, `x-settings: [S-001, S-002]`, `x-notifications: [EV-130]`. No schema change: `422` with `PLAN_LIMIT_REACHED` was already a declared response code.

## Alternatives
- (a) Contract default (restore to active, no check, no notice): rejected by the Owner (Q-123).
- Restore over the limit and let the owner choose which gig to remove: needs a new owner flow and still breaks R-2.3 in between.
- Restore to `pending` when S-070 is OFF: not asked for; the gig was active and unchanged, and a pending gig would send EV-19 to admins for a decision staff just made.

## Consequences
- Backend: 4.3.2b adds the columns, enum and constraints; 4.3.7 implements the rule with tests (limit reached → 422; restore after the owner freed a slot; S-070 OFF still → active; 31 days → 422 GIG_RESTORE_WINDOW_EXPIRED; owner removal → 409); 4.3.8 adds EV-130 to the outbox event list, the mail templates and the one-catalogue test. In-app + push of EV-130 come with slice 15 (4.14), like EV-20/EV-21.
- Admin web (4.3.13): the restore action shows `t_admin_gig_restore_plan_limit` on the 422. Web and mobile need nothing new (the owner sees the gig active again through `gig.status_changed`).
- i18n: 4 NEW keys (spec 16 Texts), added to `packages/i18n` in 4.3.2b.
- Coverage unchanged (no new AC; `16 AC-20` already covered by `adminRestoreGig`). Generated `packages/types` / `packages/api-client` regenerated (contract 1.5.0).
