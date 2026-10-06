-- Security review 07 SEC-74 (ROADMAP 4.2.0a, data-model §3.Q): a portfolio save marks its files inside the
-- save transaction, and the unattached-public cleanup deletes only unmarked rows. Both then update the same
-- `files` row, so row locks serialise them; a re-check of other tables after a lock wait would not see the
-- uncommitted attach.
ALTER TABLE "files" ADD COLUMN "attached_at" TIMESTAMPTZ(6);
