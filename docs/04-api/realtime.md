# Realtime contract (Socket.IO) — MyTask.ge API
Status: complete (P2-B4 integration run, 2026-09-29): §6 lists every event of `src/events/d1.yaml … d6.yaml` (34 group events + the foundation `file.processed`). Updated 2026-09-30 after the P2-B5 security review: §2 exact-origin handshake, deny-list on every revocation, client IP (SEC-01, SEC-14, SEC-16); §3.1 per-socket limits and staff room recomputation (SEC-26). Not yet approved by the Owner.
Source decisions: ADR-007 (realtime chat and notifications), ADR-014 §7 (events documented next to the contract), ADR-002 (auth).

## 1. The rule: REST writes, socket notifies
- Every state change goes through a REST operation in `openapi.yaml` (validated, rate-limited, idempotent, documented). The socket **never** accepts business writes.
- The socket only pushes **events** after the database transaction committed (outbox, data-model §1 "Writes that must notify").
- The socket is never the only delivery path: after a reconnect or app resume, clients re-read state through REST (e.g. `listConversationMessages?cursor=`, `listNotifications`). Events can be missed; REST cannot.
- Push notifications (Expo) and emails are sent by the notification service (spec 15), not by the socket.

## 2. Connection
| Item | Value |
|---|---|
| Public URL | `wss://mytask.ge/ws` (Socket.IO path `/ws`), local `ws://localhost:3000/ws` |
| Admin URL | `wss://admin.mytask.ge/ws` (staff tokens only) |
| Transport | WebSocket only (`transports: ['websocket']`), no long-polling (no sticky sessions needed, ADR-007) |
| Auth — web | the `__Host-mt_at` / `__Host-mt_staff_at` cookie sent with the handshake; `Origin` must **exactly equal** the origin of the host (`https://mytask.ge` or `https://admin.mytask.ge`; no same-site matching, ADR-002 §2) |
| Auth — mobile | `io(url, { auth: { token: '<access token>' } })` |
| Token expiry | the server emits `session.expired` and disconnects; the client refreshes (`refreshSession`) and reconnects |
| Revoked sessions | **every** revoked session (logout, password change/reset, "log out other sessions", session revoke, ban, deletion, staff disable; Redis deny-list, ADR-002 §1) is refused at the handshake and disconnected at once with `session.revoked` |
| Client IP | the handshake uses the same `ClientIpResolver` as HTTP (canonical header from Caddy only, ADR-013 §14–§19) |
| Scaling | Socket.IO Redis adapter; any API process can emit to any room |

## 3. Rooms (who receives what)
| Room | Joined | Used for |
|---|---|---|
| `user:{userId}` | automatically on connect (user token) | everything addressed to one user: badges, notifications, item updates, file processing |
| `conversation:{conversationId}` | client emits `conversation.join {conversationId}`; the server runs the same policy as `getConversation` (participant only) and acks `{ ok: true }` or `{ ok: false, code }` | `message.*`, `typing.*`, read receipts of that thread |
| `staff:{staffId}` | automatically on connect (staff token) | staff-only events (file processing of staff uploads) |
| `staff-permission:{permission}` | automatically, one room per permission the staff member holds | admin queue counters (spec 16 AC-17) |

Client → server emits are limited to: `conversation.join`, `conversation.leave`, `typing.start {conversationId}`, `typing.stop {conversationId}`, `presence.heartbeat` (every 60 s while the app is in the foreground; "online" = active in the last 10 minutes, BR-012). All other client emits are ignored.

### 3.1 Implementation notes for the gateway (P2-B5, SEC-26)
- **Per-socket emit limits** (token bucket in the gateway, Redis-backed per user so several sockets share it): `typing.start`/`typing.stop` at most 1 per 2 seconds per conversation (extra emits are dropped silently); `conversation.join` at most 30 per minute and at most 50 joined conversation rooms per socket (over the limit → ack `{ ok: false, code: 'RATE_LIMITED' }`); `presence.heartbeat` at most 1 per 30 seconds (extra ignored). A socket that exceeds 5× any limit within one minute is disconnected; the client reconnects with back-off. The limits apply per user as well as per socket.
- **Staff permission rooms are recomputed.** When a staff member's roles change (`adminReplaceStaffRoles`), or a role's permissions change (`adminUpdateRole`), the gateway emits `admin.permissions_changed` and then **disconnects every socket of the affected staff members**; on reconnect the `staff-permission:{permission}` rooms are rebuilt from the current permissions. A disabled staff member's sessions are revoked, so their sockets are dropped through the deny-list. Room membership is never taken from the client.
- The handshake and every join re-check the session against the deny-list (ADR-002 §1).

## 4. Declaring events (group runs)
Each group declares the events its operations emit in its own file `docs/04-api/src/events/d<n>.yaml` (never another group's file):
```yaml
events:
  - name: message.created                 # dotted lower snake case; first segment = your noun (§5)
    room: 'conversation:{conversationId}' # one of the room patterns in §3
    payload: MessageCreatedEvent          # schema in src/schemas/d<n>.yaml, name ends with "Event"
    emittedBy: [createConversationMessage] # operationIds (or "job:<name>" for worker-emitted events)
    covers: ['08 AC-12']                   # optional, ACs whose realtime behaviour this implements
    description: New message in a thread; clients append it and update unread counts.
```
- Every payload is wrapped in the shared `RealtimeEnvelope { event, id, occurredAt, data }`; `data` has the payload schema.
- Operations that emit list the names in `x-emits: [message.created]`; `scripts/check-contract.mjs` checks that each name is declared.
- Payloads carry ids and small display data only. No secrets, no amounts that the receiver may not see, no message bodies for rooms that are not the conversation room.

## 5. Event name ownership (first segment)
| Group | First segments it may use |
|---|---|
| F0 | `file` (declared here: `file.processed`, payload `FileProcessedEvent`, room `user:{ownerUserId}` / `staff:{staffId}`, emitted by the scan job) |
| D1 | `account`, `session`, `profile`, `kyc` |
| D2 | `gig`, `review` |
| D3 | `payment`, `wallet`, `subscription`, `points`, `withdrawal` |
| D4 | `cart`, `order`, `escrow`, `offer`, `refund`, `dispute`, `unblock` |
| D5 | `conversation`, `message`, `typing`, `presence`, `project`, `proposal`, `award`, `contract` |
| D6 | `notification`, `badge`, `admin` |

`session.expired` and `session.revoked` (D1) are sent by the gateway itself; D1 declares their payloads.

## 6. Event catalogue
Generated by the integration run from `src/events/d1.yaml … d6.yaml` (the files are the source; keep this table in sync when an event changes). `scripts/check-contract.mjs` checks both directions: every operation named in `emittedBy` lists the event in its `x-emits`, and every `x-emits` entry is declared with that operation in `emittedBy`.

Emitters named `job …` are not REST operations:
- `realtime-gateway`, `realtime-gateway-token-expiry`: the Socket.IO gateway itself (relayed client emits `typing.*`, presence heartbeats, token expiry).
- `bog-callback`, `bog-reconcile`, `subscription-renewal`, `payout-sync`, `escrow-auto-release`, `refund-auto-reject`, `offer-expiry`, `award-expiry`, `files-scan`: worker jobs of ADR-008 / ADR-004 / ADR-009.
- `referral-credit`, `thread-system-messages`, `notification-dispatch`, `admin-queue-counters`: outbox relays that push after the commit of a domain service call made inside another operation (e.g. the referral credit inside D1 account activation; system lines in item threads).

| Event | Room | Payload | Emitted by | Covers | Owner |
|---|---|---|---|---|---|
| `file.processed` | `user:{ownerUserId}` / `staff:{staffId}` | `FileProcessedEvent` | job `files-scan` (after `completeFileUpload` / `adminCompleteFileUpload`) | – | F0 |
| `session.revoked` | `user:{userId}` | `SessionRevokedEvent` | `logout`, `completePasswordReset`, `changeMyPassword`, `revokeMyOtherSessions`, `deleteMe`, `adminBanUser`, `adminRevokeUserSessions`, `adminDeleteUser` | 01 AC-42, 01 AC-45 | D1 |
| `session.expired` | `user:{userId}` | `SessionExpiredEvent` | job `realtime-gateway-token-expiry` | – | D1 |
| `account.updated` | `user:{userId}` | `AccountUpdatedEvent` | `confirmEmailChange`, `updateMyProfile`, `putMyAvatar`, `deleteMyAvatar`, `adminUpdateUser`, `adminDeleteUserAvatar`, `adminActivateUser`, `adminCreateRestriction`, `adminDeleteRestriction`, `adminApproveRestrictionAppeal`, `adminRejectRestrictionAppeal`, `adminApproveKycVerification`, `adminDeclineKycVerification` | 01 AC-19 | D1 |
| `gig.status_changed` | `user:{ownerUserId}` | `GigStatusChangedEvent` | `adminPublishGig`, `adminRejectGig`, `adminRemoveGig`, `adminRestoreGig` | 04 AC-17, 04 AC-18 | D2 |
| `review.received` | `user:{subjectUserId}` | `ReviewReceivedEvent` | `createReview` | 07 AC-9 | D2 |
| `payment.status_changed` | `user:{payerUserId}` | `PaymentStatusChangedEvent` | `createPayment`, `adminConfirmBankTransfer`, `adminRejectBankTransfer`, `adminCheckPaymentStatus`, job `bog-callback`, job `bog-reconcile` | 05 AC-12 | D3 |
| `wallet.balance_changed` | `user:{userId}` | `WalletBalanceChangedEvent` | `createPayment`, `createWithdrawal`, `adminRejectWithdrawal`, `adminConfirmBankTransfer`, `adminCreateLedgerAdjustment`, `adminReleaseLegacyHold`, `adminWriteOffLegacyHold`, `cancelOrderItem`, `completeEscrow`, `cancelCustomOffer`, `acceptRefundRequest`, `adminReleaseEscrow`, `adminRefundEscrow`, `adminResolveDispute`, `adminApproveUnblockRequest`, job `bog-callback`, job `bog-reconcile`, job `escrow-auto-release` | 05 AC-27 | D3 |
| `subscription.changed` | `user:{userId}` | `SubscriptionChangedEvent` | `cancelSubscription`, `resumeSubscription`, `purchaseSubscriptionWithPoints`, `createPayment`, `deleteSavedCard`, `adminGiftSubscription`, `adminCancelSubscription`, job `bog-callback`, job `subscription-renewal` | 09 AC-4, 09 AC-5 | D3 |
| `points.balance_changed` | `user:{userId}` | `PointsBalanceChangedEvent` | `purchaseSubscriptionWithPoints`, `adminCreatePointsAdjustment`, job `referral-credit` | – | D3 |
| `withdrawal.status_changed` | `user:{userId}` | `WithdrawalStatusChangedEvent` | `adminMarkWithdrawalPaid`, `adminRejectWithdrawal`, job `payout-sync` | 14 AC-18 | D3 |
| `cart.updated` | `user:{userId}` | `CartUpdatedEvent` | `putCartItem`, `deleteCartItem`, `mergeCart` | 06 AC-4 | D4 |
| `order.item_updated` | `user:{userId}` | `OrderItemUpdatedEvent` | `deleteOrder`, `putOrderItemRequirements`, `startOrderItem`, `cancelOrderItem`, `createEscrowDelivery`, `createEscrowRevisionRequest`, `completeEscrow`, `acceptRefundRequest`, `adminReleaseEscrow`, `adminRefundEscrow`, `adminResolveDispute`, `adminApproveUnblockRequest`, job `escrow-auto-release` | – | D4 |
| `escrow.updated` | `user:{userId}` | `EscrowUpdatedEvent` | `cancelOrderItem`, `createEscrowDelivery`, `createEscrowRevisionRequest`, `completeEscrow`, `cancelCustomOffer`, `createRefundRequest`, `acceptRefundRequest`, `declineRefundRequest`, `closeRefundRequest`, `createDispute`, `adminReleaseEscrow`, `adminRefundEscrow`, `adminResolveDispute`, `adminApproveUnblockRequest`, job `escrow-auto-release`, job `refund-auto-reject` | 06 AC-33 | D4 |
| `offer.updated` | `user:{userId}` | `CustomOfferUpdatedEvent` | `createCustomOffer`, `declineCustomOffer`, `withdrawCustomOffer`, `cancelCustomOffer`, `createEscrowDelivery`, `createEscrowRevisionRequest`, `completeEscrow`, `acceptRefundRequest`, `adminApproveCustomOffer`, `adminRejectCustomOffer`, `adminReleaseEscrow`, `adminRefundEscrow`, `adminResolveDispute`, `adminApproveUnblockRequest`, job `offer-expiry`, job `escrow-auto-release` | 12 AC-18 | D4 |
| `offer.request_updated` | `user:{userId}` | `CustomOfferRequestUpdatedEvent` | `createCustomOfferRequest`, `createCustomOffer`, `declineCustomOfferRequest`, `cancelCustomOfferRequest` | – | D4 |
| `refund.updated` | `user:{userId}` | `RefundRequestUpdatedEvent` | `createRefundRequest`, `acceptRefundRequest`, `declineRefundRequest`, `closeRefundRequest`, `createDispute`, `completeEscrow`, `cancelCustomOffer`, `adminReleaseEscrow`, `adminRefundEscrow`, `adminResolveDispute`, job `refund-auto-reject` | 13 AC-8 | D4 |
| `unblock.updated` | `user:{userId}` | `UnblockRequestUpdatedEvent` | `createUnblockRequest`, `completeEscrow`, `createRefundRequest`, `acceptRefundRequest`, `adminReleaseEscrow`, `adminRefundEscrow`, `adminResolveDispute`, `adminApproveUnblockRequest`, `adminRejectUnblockRequest`, job `escrow-auto-release` | 13 AC-27 | D4 |
| `message.created` | `conversation:{conversationId}` | `MessageCreatedEvent` | `createConversationMessage`, `adminCreateConversationMessage`, `createEscrowRevisionRequest`, `createCustomOffer`, `createCustomOfferRequest`, job `thread-system-messages` | 08 AC-6, 08 AC-28, 11 AC-40 | D5 |
| `message.updated` | `conversation:{conversationId}` | `MessageUpdatedEvent` | `deleteConversationMessage`, `adminHideConversationMessage`, `adminUnhideConversationMessage` | 08 AC-25, 08 AC-31 | D5 |
| `conversation.read` | `conversation:{conversationId}` | `ConversationReadEvent` | `markConversationRead` | 08 AC-15 | D5 |
| `conversation.updated` | `user:{userId}` | `ConversationUpdatedEvent` | `createConversationMessage`, `adminCreateConversationMessage`, `removeConversationFromList` | 08 AC-19, 08 AC-26 | D5 |
| `conversation.unread_count_changed` | `user:{userId}` | `ConversationUnreadCountChangedEvent` | `createConversationMessage`, `adminCreateConversationMessage`, `markConversationRead` | 08 AC-18 | D5 |
| `typing.started` | `conversation:{conversationId}` | `TypingEvent` | job `realtime-gateway` | 08 AC-16 | D5 |
| `typing.stopped` | `conversation:{conversationId}` | `TypingEvent` | job `realtime-gateway` | 08 AC-16 | D5 |
| `presence.changed` | `conversation:{conversationId}` | `PresenceChangedEvent` | job `realtime-gateway` | 08 AC-17 | D5 |
| `project.status_changed` | `user:{userId}` | `ProjectStatusChangedEvent` | `closeProject`, `declineAward`, `cancelContract`, `adminApproveProject`, `adminRejectProject`, `adminHideProject`, `adminUnhideProject` | – | D5 |
| `proposal.status_changed` | `user:{userId}` | `ProposalStatusChangedEvent` | `createProposal`, `updateProposal`, `withdrawProposal`, `createAward`, `revokeAward`, `acceptAward`, `declineAward`, `cancelContract`, `adminApproveProposal`, `adminRejectProposal`, job `award-expiry` | – | D5 |
| `award.status_changed` | `user:{userId}` | `AwardStatusChangedEvent` | `createAward`, `revokeAward`, `acceptAward`, `declineAward`, `closeProject`, job `award-expiry` | 11 AC-22 | D5 |
| `contract.status_changed` | `user:{userId}` | `ContractStatusChangedEvent` | `acceptAward`, `cancelContract`, `createPayment`, `createEscrowDelivery`, `createEscrowRevisionRequest`, `completeEscrow`, `acceptRefundRequest`, `adminReleaseEscrow`, `adminRefundEscrow`, `adminResolveDispute`, `adminApproveUnblockRequest`, job `bog-callback`, job `bog-reconcile`, job `escrow-auto-release` | – | D5 |
| `notification.created` | `user:{userId}` | `NotificationCreatedEvent` | job `notification-dispatch` | 15 AC-12 | D6 |
| `notification.read` | `user:{userId}` | `NotificationReadEvent` | `markNotificationRead`, `markAllNotificationsRead` | 15 AC-14 | D6 |
| `badge.updated` | `user:{userId}` | `NotificationBadgeEvent` | `markNotificationRead`, `markAllNotificationsRead`, `createConversationMessage`, `adminCreateConversationMessage`, `markConversationRead`, job `notification-dispatch` | 15 AC-12, 15 AC-25 | D6 |
| `admin.queue_counters_updated` | `staff-permission:{permission}` | `AdminQueueCountersEvent` | `adminDismissReports`, `adminResolveReports`, job `admin-queue-counters` | 16 AC-17 | D6 |
| `admin.permissions_changed` | `staff:{staffId}` | `StaffPermissionsChangedEvent` | `adminReplaceStaffRoles`, `adminUpdateRole` | 16 AC-12 | D6 |

### 6.1 Cross-group emissions (decided by the integration run)
- `message.created` is also emitted by D4 `createEscrowRevisionRequest` (revision message in the item thread, spec 06 AC-26), `createCustomOffer` (offer card, spec 12 AC-9) and `createCustomOfferRequest` (request card, spec 12 AC-3): D4 writes through the D5 conversation service, never through D5's REST operations.
- `contract.status_changed` is emitted by D3 `createPayment` (wallet payment of a contract) and the D4 escrow operations that change a contract's status (delivery, revision, completion, refund, staff release/refund, dispute decision, unblock approval), plus the jobs `bog-callback`, `bog-reconcile`, `escrow-auto-release`.
- `wallet.balance_changed` is emitted by every D4 operation that posts a ledger journal (cancel before start, completion, offer cancel, refund accept, staff release/refund, dispute decision, unblock approval).
- `badge.updated` is emitted by D5 `createConversationMessage`, `adminCreateConversationMessage` and `markConversationRead` (the badge counts conversations with unseen messages, spec 15 AC-25).
