# Realtime contract (Socket.IO) — MyTask.ge API
Status: foundation written in P2-B4 part 1 (2026-09-29). Event tables (§6) are filled from `src/events/d*.yaml` by the integration run.
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
| Auth — web | the `mt_at` / `mt_staff_at` cookie sent with the handshake; `Origin` must be the site origin |
| Auth — mobile | `io(url, { auth: { token: '<access token>' } })` |
| Token expiry | the server emits `session.expired` and disconnects; the client refreshes (`refreshSession`) and reconnects |
| Banned / restricted | a revoked session (Redis deny-list, ADR-002 §1) is disconnected at once with `session.revoked` |
| Scaling | Socket.IO Redis adapter; any API process can emit to any room |

## 3. Rooms (who receives what)
| Room | Joined | Used for |
|---|---|---|
| `user:{userId}` | automatically on connect (user token) | everything addressed to one user: badges, notifications, item updates, file processing |
| `conversation:{conversationId}` | client emits `conversation.join {conversationId}`; the server runs the same policy as `getConversation` (participant only) and acks `{ ok: true }` or `{ ok: false, code }` | `message.*`, `typing.*`, read receipts of that thread |
| `staff:{staffId}` | automatically on connect (staff token) | staff-only events (file processing of staff uploads) |
| `staff-permission:{permission}` | automatically, one room per permission the staff member holds | admin queue counters (spec 16 AC-17) |

Client → server emits are limited to: `conversation.join`, `conversation.leave`, `typing.start {conversationId}`, `typing.stop {conversationId}`, `presence.heartbeat` (every 60 s while the app is in the foreground; "online" = active in the last 10 minutes, BR-012). All other client emits are ignored.

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
Filled by the integration run from `src/events/d1.yaml … d6.yaml` (one table per group: name, room, payload, emitted by, covers).

| Event | Room | Payload | Emitted by | Owner |
|---|---|---|---|---|
| `file.processed` | `user:{ownerUserId}` / `staff:{staffId}` | `FileProcessedEvent` | job `files-scan` (after `completeFileUpload` / `adminCompleteFileUpload`) | F0 |
