# ADR-007: Realtime chat and notifications — self-hosted Socket.IO, SendGrid email, Expo push, SMS interface
Date: 2026-09-28 | Status: proposed

## Context
- Chat and notifications are vision priority 5. Legacy chat is Chatify on Pusher (`/inbox`) with hard-coded Pusher secrets (R-003) and app-generated message ids `mt_rand + time()` (R-038); refund threads broadcast over Pusher too (`notifications.md`).
- Owner: admin must be able to view chat history between users (Q-015); migrate Inbox and delivery/refund threads, not the old `conversations` (Q-065); starting a chat is not Premium-gated (Q-069b); email provider is SendGrid (Q-033); multiple admin recipients (Q-026, S-100); push NEW (P-11, S-101); SMS-ready but off (S-102); renewal reminder email + in-app (Q-066); keep every legacy notification (CLAUDE.md, `notifications.md`).
- Fixed rules: offline chat email at most once per 10 minutes per sender (BR-120); online = active in the last 10 minutes (BR-012).
- Budget: avoid per-connection SaaS fees; everything must run locally.

## Decision
### Realtime
1. **Socket.IO gateway inside the NestJS codebase** (`/ws` path, same origin), with the Redis adapter so several API processes can fan out. Authenticated with the access token at connection time (cookie on web, token in the handshake on mobile); a connection joins only rooms it is allowed to see (`user:{id}`, `conversation:{id}` after a policy check).
2. **Writes go through REST, not the socket.** `POST /api/v1/conversations/{id}/messages { clientMessageId (UUID), body, attachmentIds }` validates, stores, and then emits `message.created` to the room. `clientMessageId` makes retries idempotent; server ids are UUIDv7 (time-ordered, no collisions; fixes R-038). Reads are paginated REST (`GET …/messages?cursor=`). The socket carries only events: new message, read receipts, typing, notification badge counts, and order/refund thread updates.
3. **Presence.** "Online" is derived from last activity in Redis (10 minutes, BR-012), updated by API requests and socket heartbeats.
4. **Mobile.** Socket connected in the foreground; in the background the app relies on push. On resume it fetches missed messages via REST (the socket is never the only delivery path).

### Chat model
5. **Conversation types:** `direct` (user ↔ user, the Inbox), `order_item`, `project`, `custom_offer`, `refund` (dispute threads). One message table with a conversation id; attachments are `files` in the private bucket (ADR-009).
6. **Admin visibility (Q-015):** staff with permission `chat.read` can list and open conversations read-only in the admin panel; staff can post into refund/dispute threads as "MyTask" (legacy admins wrote in refund threads). Every staff open of a conversation is audit-logged (who, which conversation, when).
7. Chat is open to every active user; restricted/banned users cannot send (policy). Blocking/reporting follows spec 08.

### Notifications
8. **One NotificationService.** Domain code emits typed events (`order.delivered`, `refund.opened`, `subscription.renewal_reminder`, …). A catalogue (`notification-catalogue.ts`) maps each event to recipients, channels (in_app, email, push, sms), template keys and whether it is an admin notification. The catalogue is derived from `notifications.md` and spec 15; a test fails if a catalogue entry has no template or if a legacy notification listed in spec 15 as "kept" is missing.
9. **Channels** (each behind an interface, sending always via BullMQ with retries and backoff):
   - `in_app`: row in `notifications` (key + params + target resource, rendered in the reader's locale, legacy pattern) + realtime badge update.
   - `email`: `MailTransport` interface — `SendGridTransport` (HTTP API, key in `.env`) in staging/production, `SmtpTransport` to Mailpit locally. Templates are React Email (or MJML) components using the same i18n keys (`t_subject_*`, `t_notification_*`), current logo (Q-076), in the recipient's locale. SendGrid event webhook (bounces/spam reports) can mark addresses as undeliverable later.
   - `push`: Expo Push Service via `expo-server-sdk`; `push_tokens` per installation (user, platform, token, locale, last seen); invalid tokens removed from receipts. Sent for the same events as in-app (P-11) when S-101 is ON. Push content is minimal (no sensitive details, e.g. no amounts or message bodies on the lock screen unless spec 15 decides otherwise).
   - `sms`: `SmsProvider` interface with a `NoopSmsProvider`; S-102 OFF. A Georgian SMS provider can be added by implementing one class.
10. **Admin recipients:** admin notifications are sent to every address in S-100 (≥ 1, default `ir.gvazava@gmail.com`).
11. **Throttles:** offline chat email once per 10 minutes per sender→recipient (Redis key with TTL); push collapsing per conversation.
12. **User preferences:** spec 15 decides whether users can mute categories; the catalogue supports a per-user, per-category opt-out for non-essential notifications (transactional/security ones cannot be muted).

## Alternatives considered
- **Keep Pusher (Chatify protocol)** — paid per connections/messages, leaked secret must be rotated, and another external dependency. Rejected.
- **Soketi (self-hosted Pusher protocol)** — viable and lets us use `pusher-js`, but one more container and a less active project; Socket.IO runs in our own process. Rejected.
- **Centrifugo** — excellent at scale; unnecessary for MyTask's size. Can replace the gateway later behind the same events.
- **Firebase (FCM direct) for push** — Expo Push wraps APNs and FCM for free and matches the Expo stack. FCM/APNs direct remains possible later.
- **Writes over the socket** — harder to validate, rate-limit and document in OpenAPI. Rejected.
- **Amazon SES instead of SendGrid** — cheaper at volume, but the Owner already uses SendGrid (Q-033). The transport interface allows a switch.

## Consequences
- Easier: no chat SaaS bill; chat works identically on web and mobile; every notification is traceable in one catalogue; providers are swappable.
- Harder: we run the WebSocket gateway ourselves (sticky sessions not needed with Socket.IO + Redis adapter when clients use WebSocket transport; Caddy must allow upgrades).
- Must change: spec 08 (threads, admin visibility, attachments), spec 15 (catalogue, push events, NEW items marked); data-model.md (`conversations`, `messages`, `notifications`, `push_tokens`); openapi.yaml documents REST endpoints and lists socket event names/payloads in a vendor extension or companion doc.
- **Owner question (handoff):** users should be told that staff may read conversations for dispute resolution (terms/privacy text). Legal wording is the Owner's decision.
