# 08 — Chat: Inbox list + conversation (`/inbox`, `/inbox/{userUid}`)
Status: proposed | Author: ui-ux-designer (P2-C4) | Date: 2026-09-29
Specs: 08 AC-1…34 (entry points, read-only, saved messages, sending, attachments, Enter behaviour, rate limit, read state, typing, presence, contacts, favourites, search, offline email/push, delete/hide, custom offers in chat, other threads, staff view, deleted users); 12 (offer cards); 15 (push). Components §9 (ConversationList, ChatBubble, SystemMessage, Composer). Audit §3.11.

## Kept from the live site (Chatify)
- Two panes: contact list on the left (search, Favourites, conversations), conversation on the right (header with the user, messages, send form with attachment and emoji).
- A collapsible info pane (shared photos, delete conversation).
- "Saved messages" (your own conversation).
- Bubble shapes: received with the bottom-left corner square, sent with the bottom-right corner square, sent in the brand colour.

## Changes
- Sent bubbles use `chat.sentBg` / `chat.sentText` (6.45:1; legacy white on `#35A29F` was 3.08:1).
- **Enter inserts a new line; Ctrl/Cmd+Enter or Send sends** (08 AC-11). components.md §9.3 was corrected in this task.
- New incoming messages are announced (`role="log"`, polite).
- `100dvh` layout, so the send box is never hidden under the mobile browser toolbar.
- The list pane is 320 px (legacy 280/45 %). Phones show one pane at a time.
- "Create an offer" / "Request an offer" in the header when S-034 is ON (08 AC-27). Offers show as cards in the thread.
- Order, project and refund threads stay on their own pages. They are not in the Inbox (08 AC-28).
- A staff-review notice at the bottom of the list (P-71 clause, 08 screens).

## Desktop (≥ 1024)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header (solid)                                                               │
├───────────────────────┬──────────────────────────────────────┬───────────────┤
│ ‹ Home                │ ◉ Nino K. ● Online    ☆   [Create an offer] [Request│ Info (toggle ⓘ)│
│ Messages (h1)         │                        an offer]  ⓘ  │               │
│ [🔍 Search contacts ] │──────────────────────────────────────│ ◉ Nino K.     │
│ Favourites            │           ─── Today ───              │ View profile  │
│ ◉ ◉ ◉ ◉  (row)        │ ┌───────────────────┐                │ Shared photos │
│ ☆ Saved messages      │ │ received bubble   │ 10:02          │ [▢][▢][▢]     │
│ ───────────────────── │ └───────────────────┘                │ (or "Nothing  │
│ ▌◉ Nino K.      10:05 │          ┌──────────────────────┐    │ shared yet")  │
│   Sure, I can …    [2]│    10:04 │ sent bubble      ✓✓  │    │               │
│ ◉ Giorgi B.   Yesterday│          └──────────────────────┘    │ [Delete       │
│   Thanks!             │ ┌ Offer card (spec 12) ───────────┐  │  conversation]│
│ ◉ …                   │ │ Logo pack · ₾300.00 · 5 days · ↻2│  │               │
│                       │ │ Expires in 2 days  [Pay] [Decline]│ │               │
│                       │ └──────────────────────────────────┘ │               │
│                       │ Nino is typing…                      │               │
│ ───────────────────── │──────────────────────────────────────│               │
│ ⓘ Messages may be     │ [😊] [📎] ┌──────────────────────┐ [➤]│               │
│ reviewed by staff …   │           │ Write a message…     │    │               │
│                       │           └──────────────────────┘    │               │
└───────────────────────┴──────────────────────────────────────┴───────────────┘
```
List 320 px, info pane 300 px, collapsible; the conversation takes the rest. The conversation header always has a visible name. The online dot has the text `t_online`.

## Mobile web (360) and native
```
List screen                          Conversation screen
┌──────────────────────────────┐     ┌──────────────────────────────┐
│ Messages                      │     │ ‹ ◉ Nino K. ● Online   ⋯     │  ⋯ = star, offers,
│ [🔍 Search contacts        ]  │     │                              │  info sheet, delete
│ Favourites ◉ ◉ ◉ →            │     │        ─── Today ───         │
│ ☆ Saved messages              │     │ ┌──────────────┐             │
│ ◉ Nino K.          10:05  [2] │     │ │ received     │             │
│   Sure, I can …               │     │ └──────────────┘             │
│ ◉ Giorgi B.      Yesterday    │     │           ┌───────────────┐  │
│ …                             │     │           │ sent       ✓✓ │  │
│ ⓘ Messages may be reviewed…   │     │           └───────────────┘  │
└──────────────────────────────┘     ├──────────────────────────────┤
 native: Messages tab (unread badge)  │ [📎] [ Write a message…  ] [➤]│  pinned above keyboard
                                      └──────────────────────────────┘  and safe area
```
- Web phones: list and conversation are two routes (`/inbox`, `/inbox/{userUid}`); back returns to the list at the same scroll position.
- Native: pull to refresh on the list. 📎 opens a sheet with Camera, Photo library and Files. Push notifications deep-link to the conversation (15).
- Emoji: web only. Native uses the keyboard's emoji (S-098 applies to the web picker).

## Components
ConversationList + ConversationItem, SearchBar `inline`, Avatar + OnlineStatus, IconButton (star, info, attach, emoji, send), Button (offer actions), ChatBubble, SystemMessage, date separators (Divider with label), offer card (Card + Price + Countdown + Buttons; spec 12), Composer (Textarea auto-grow 1–6 lines), attachment preview chips + ProgressBar, Lightbox (images), Banner (offline, read-only, staff notice), EmptyState, Skeleton (`ChatListSkeleton`), Toast, BottomSheet (attach, ⋯ menu on phones).

## States
| State | What shows | AC / spec 08 screens |
|---|---|---|
| Loading list | `ChatListSkeleton` rows | screens |
| No contacts | EmptyState `t_ur_contact_list_is_empty` | screens |
| Search, no result | `t_no_results_found` | AC-19…22 |
| No conversation selected (desktop) | EmptyState `t_no_conversation_selected_subtitle` in the conversation pane | screens |
| New conversation | Hint `t_type_something_to_start_messaging`; created on the first message | AC-1 |
| Sending | Bubble at once with `t_ui_sending` (clock icon + text) | AC-6 |
| Failed | Bubble with a retry icon + `t_ui_message_not_sent`; retry never duplicates | AC-6 |
| Empty send | `t_enter_your_message` under the box | AC-7 |
| Too long (> 5,000) | `t_message_too_long` | AC-7 |
| Too fast (> 30/min) | `t_sending_too_fast` | AC-12 |
| Attachment refused | `t_selected_file_extension_is_not_allowed` / `t_selected_file_size_big` | AC-8 |
| Attachments OFF (S-094) / emoji OFF (S-098) | Button hidden | AC-9 |
| Read-only (other user banned, deleted, restricted, pending) | Banner `t_conversation_read_only`; no Composer | AC-3, AC-33 |
| Viewer restricted | Restrictions centre instead of the Inbox | AC-5 |
| Offline / reconnecting | Banner `t_chat_no_internet_access`; header status `t_chat_connecting` → `t_chat_connected` | screens |
| Typing | "… is typing" line above the Composer | AC-14…18 |
| Read state | ✓ Sent / ✓✓ Seen, with text for screen readers | AC-14…18 |
| Info pane empty | `t_nothing_shared_yet` | screens |
| Offers OFF (S-034) | Offer buttons hidden; existing offer cards stay readable | AC-27 |
| Staff read-only view (admin app) | Same bubbles, no Composer, Banner `t_ui_staff_read_only_view` | AC-29…32 |

## Accessibility
- The list is a list of links. Each item's name reads the contact, the unread count, the last message and the time.
- Messages: `role="log"`, `aria-live="polite"` for incoming messages only. Each message has the sender and time in its accessible text.
- The Composer has a visible or programmatic label and the keyboard hint `t_ui_send_shortcut_hint` as help text (desktop only).
- Focus stays in the Composer after sending. New messages never steal focus.
- Every icon button has a name (`t_ui_attach_file`, `t_ui_send`, …).

## Georgian length
Names can be ellipsised in the list only (the full name stays in the accessible label). Preview text is one line. Header offer buttons collapse into the ⋯ menu when the header is narrower than their labels.
