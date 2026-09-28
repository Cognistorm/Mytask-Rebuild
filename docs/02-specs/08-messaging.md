# 08 — Messaging (Inbox chat)
Status: **approved** (Owner 2026-09-29; P-66…P-105 accepted)
Author: product-analyst (P2-A4) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-012, BR-120, BR-121, BR-122; `notifications.md` (`User/Everyone/NewMessage`, header unread count); `data-model.md` (`ch_messages`, `ch_favorites`); `risks-and-debt.md` R-003, R-038, R-039. Owner decisions: Q-015, Q-040, Q-065, Q-069b, Q-083, Q-026, Q-058. Platform rules: `00-platform-rules.md` R-1.3, R-1.4, §4.14 (S-094…S-099), §4.18 (online = 10 minutes; offline email once per 10 minutes per sender), X-11; P-11. Specs: 01 AC-19 (restricted users), 02 AC-11 ("Contact me"), 02 AC-12 ("Request an offer"), 02 P-21 ("Deleted user"), 04 AC-31 ("Contact seller"), 06 AC-40/AC-41 (order delivery thread), 11 (project thread), 12 (custom offers in chat), 13 (refund threads), 15 (notification catalogue), 16 (staff RBAC). ADR-007 (realtime), ADR-009 (private files).

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-66…P-72, see "Open questions").

Legacy code traced for this spec (read-only):
- **Inbox (Chatify)** routes from `config/chatify.php:24-33` (prefix `inbox`, `web` + `auth`); page `resources/views/vendor/Chatify/pages/app.blade.php` (contact list with search, Favourites row, "Saved messages" item, message pane with connection state and typing indicator, info panel); info panel `layouts/info.blade.php` (avatar, full name, username, "ID verified" badge, "View profile", "Delete conversation", shared photos).
- **Controller** `app/Http/Controllers/Chat/MessagesController.php`: open a chat only with an `active|verified` user other than yourself `:56-62`; send `:165-302` (one attachment per message, extension and size from `live_chat_settings`, original name kept `:178-217`; text required when there is no file `:219-233`; no length limit; message id `mt_rand + time()` `:239` = R-038; Pusher push `:260-264`); **offline email** `NewMessage` once per 600 s per sender→recipient key, sent when the recipient is not connected to the chat (`active_status != 1`) or not online, in the **app** locale, not the recipient's `:266-291`; messages 30 per page `:25, :309-351`; seen `:358-367`; contacts = users you exchanged messages with, newest conversation first, 30 per page `:374-419`; favourites toggle and list `:455-508`; search only inside your contacts by username or full name `:515-564`; shared photos `:571-595`; **delete conversation is a no-op** (the call is commented out, the UI says "deleted") `:602-611`; delete message `:618-627`; **set active status for any `user_id` sent by the browser** `:634-649` (anyone can change anyone's status).
- **ChatApi** `app/Utils/Chat/ChatApi.php`: max size and allowed types from settings `:43-80`; delete message = sender only, hard delete + file removed `:649-690` (the UI offers "Delete" only while the message is unseen, `layouts/messageCard.blade.php:112-116`, but the server deletes seen messages too); attachments served from a public storage URL `:727-731` (R-039 class).
- **Send form** `layouts/sendForm.blade.php`: emoji picker when S-098 is ON `:4-19`; attach button when S-094 is ON `:22-28` (the `accept` list comes from `config/chatify.php:82-84` — `zip, rar, txt, pdf` — while the server checks the settings list — `zip, pdf, txt, psd` —, so `psd` is hidden and `rar` is refused); **Enter does not send** (new line only) `:285-291`.
- **Admin** `app/Livewire/Admin/Conversations/ConversationsComponent.php` (list of all Chatify messages, search by username/full name `:60-92`, **hard delete** of any message with its file `:203-238`) and `ConversationViewer.php:25-76` (thread between two users, 30 per page). No audit log of who read what.
- Project page "Chat now" goes to chat only for Premium users, others to `/subscription` (`resources/views/livewire/main/project/project.blade.php`, label hard-coded "კონტაქტი"); bid card "chat" is shown to the client for every bidder until an award, then only for the awarded freelancer (`app/Livewire/Main/Cards/Bid.php:82-98`).
- Legacy `conversations` chat (`/messages/*`, block/unblock) — removed, not migrated (X-11, Q-065).

---

## Goal
Let any two users talk directly and in real time on web and mobile — text, files and images, read state, online status, favourites and search — so that buyers and freelancers can agree on work (and on custom offers, spec 12). Keep the history safe as evidence: staff with permission can read it (Q-015), every staff access is logged, and users are told so in the Terms & Privacy (Q-083).

## Roles involved
- **User** (any active user, both roles): starts and replies to conversations, sends attachments, marks favourites, searches contacts, deletes own unseen messages, removes a conversation from their list. Chat is **not** Premium-gated (Q-069b, BR-120).
- **Guest**: sees "Contact me" / "Contact seller" / "Chat now", is sent to login.
- **Restricted / banned / deleted user**: cannot use chat (01 AC-19; R-1.4); appears as read-only counterpart.
- **Staff** with permission `chat.read` (spec 16): read-only access to every conversation and thread, with audit log; `chat.moderate` to hide a message.
- **System**: offline email and push, realtime delivery (ADR-007).

## User stories
- As a buyer, I want to message a freelancer from their profile, gig or proposal, so that I can ask questions before I order.
- As a freelancer, I want to see new messages instantly and get an email or push when I am away, so that I do not lose clients.
- As a user, I want to send files and images in the chat, so that I can share briefs and examples.
- As a user, I want to see whether my message was read and whether the other person is online.
- As a user, I want to star important contacts and search my contacts, so that I find conversations fast.
- As the Owner, I want staff to read conversations when a dispute or report needs it, with every access logged, so that agreements can be verified fairly (Q-015).

## Acceptance criteria

### Starting a conversation (LEGACY entry points; Q-069b)
- AC-1 Given a logged-in user on someone else's profile (02 AC-11), gig page (04 AC-31), project page ("Chat now" next to client info) or a proposal card (spec 11), When they press the chat button, Then the conversation with that user opens in the Inbox (`/inbox/{userUid}` on web; Inbox tab → conversation on mobile), creating it on the first message. Guests are sent to login and brought back. (LEGACY `MessagesController.php:56-62`)
- AC-2 Given a Standard (non-Premium) user on a project page, When they press "Chat now", Then the chat with the client opens; nothing asks for Premium. (CHANGE Q-069b; legacy sent Standard users to `/subscription`)
- AC-3 Given the target user is banned, deleted, restricted or pending, When anyone tries to start a new conversation with them (screen or API), Then it is refused with `t_user_cannot_receive_messages`. An existing conversation with such a user stays readable, shows `t_conversation_read_only` and has no send box. (LEGACY opened chat only with active/verified users; read-only state ACCEPTED P-69)
- AC-4 Given a user opens a conversation with their own account, When the Inbox loads, Then it is the "Saved messages" conversation (`t_saved_messages`): notes only the user sees, never emailed or pushed. (LEGACY Chatify "Saved messages")
- AC-5 Given a restricted user, When they call any chat endpoint, Then the API answers `ACCOUNT_RESTRICTED` (01 AC-19); web and mobile show the Restrictions centre instead of the Inbox. (LEGACY `Restricted.php`)

### Sending (S-094…S-098; P-66)
- AC-6 Given an open conversation, When the user sends text, Then the message is stored with a server id and time, appears at once for the sender (optimistic, marked "sending" until confirmed) and in real time for the recipient on every open web tab and app. A retry of the same message (same client message id) never creates a duplicate. (LEGACY realtime; CHANGE ADR-007 ids, fixes R-038)
- AC-7 Given the text is empty and no file is attached, When the user presses Send, Then nothing is sent and `t_enter_your_message` is shown. Given the text is longer than 5,000 characters, Then it is refused with `t_message_too_long`. Text is plain text: line breaks are kept, links become clickable, HTML is shown as text. (LEGACY required-text rule `:219-233`; length limit ACCEPTED P-66)
- AC-8 Given S-094 is ON, When the user attaches one file (with or without text), Then it is accepted only if its type is in S-095 (images) or S-096 (files) and its size ≤ S-097 MB; otherwise `t_selected_file_extension_is_not_allowed` or `t_selected_file_size_big`. The picker offers exactly the types the server accepts. Images show as a preview; other files show icon, original name, size and "Download". (LEGACY `:178-217`; CHANGE: one list for picker and server, fixes the `psd`/`rar` mismatch)
- AC-9 Given S-094 is OFF, When the chat opens, Then the attach button is hidden and the API refuses files with "feature disabled" (00 AC-11). Given S-098 is OFF, Then the emoji picker is hidden. (LEGACY)
- AC-10 Given an attachment, When anyone opens or downloads it, Then only the two participants and staff with `chat.read` get a short-lived signed link; everyone else gets 404. (CHANGE ADR-009; legacy public storage URL, R-039 class)
- AC-11 Given the web message box, When the user presses Enter, Then a new line is inserted; the Send button (or Ctrl/Cmd + Enter) sends. On mobile the keyboard return key inserts a new line and the Send button sends. (LEGACY `sendForm.blade.php:285-291`; shortcut ACCEPTED P-66)
- AC-12 Given a user sends more than 30 messages within one minute, When the next message is sent, Then it is refused with `t_sending_too_fast` until the minute has passed. (NEW anti-spam, ACCEPTED P-66)
- AC-13 Given S-099 is ON, When a new message arrives in a web tab that is not the active conversation, Then a short sound plays. (LEGACY; mobile uses the push sound, AC-24)

### Reading, read state, typing and presence (BR-012)
- AC-14 Given a conversation, When it opens, Then the latest 30 messages are shown and older ones load while scrolling up (cursor, 30 per page), with date separators. (LEGACY 30 per page `:25`)
- AC-15 Given the recipient has the conversation open (web or app in the foreground), When a message arrives, Then it is marked seen and the sender's tick turns to "seen" (double blue tick) in real time. Messages are marked seen only when the conversation is actually shown. (LEGACY `seen` + ticks `messageCard.blade.php:123-130`)
- AC-16 Given the other person is typing, When the conversation is open, Then a typing indicator shows and disappears after a few seconds without typing. (LEGACY Chatify typing indicator)
- AC-17 Given any user shown in the Inbox (list and header), When they made an authenticated request or had an app/web connection in the last 10 minutes, Then a green dot and `t_online` are shown; otherwise nothing (no "last seen" time). A user can never change another user's status. (LEGACY BR-012; CHANGE fixes `setActiveStatus` accepting any `user_id`, `:634-649`)
- AC-18 Given the header (web) or the Inbox tab (mobile), When the user has unseen messages, Then a badge shows the number of conversations with unseen messages and updates in real time. (LEGACY `Includes/Header.php` unseen count)

### Contact list, favourites and search (LEGACY)
- AC-19 Given the Inbox, When it opens, Then the left column (web) or the list screen (mobile) shows the user's conversations, newest message first, 30 per load: avatar, username, online dot, last message preview (`t_you` prefix for own messages; `t_image` / `t_attachment` for files), time, and unseen count. Empty list: `t_ur_contact_list_is_empty`. (LEGACY `getContacts` `:374-419`)
- AC-20 Given a contact, When the user taps the star, Then the contact is added to or removed from Favourites, shown as a row of avatars above the list (`t_favorites`). (LEGACY `:455-508`)
- AC-21 Given the search box (`t_search_in_ur_contacts`), When the user types, Then the list shows only their own contacts whose username or full name contains the text; nobody outside their conversations is found. No match: `t_no_results_found`. (LEGACY `:515-564`)
- AC-22 Given a conversation, When the user opens the info panel (web right column; mobile header tap), Then it shows avatar, full name, username, "ID verified" when KYC is approved, "View profile", "Report user" (opens the profile report form of spec 02), "Remove from my list" (AC-26) and the images shared in this conversation (`t_shared_photos`, empty: `t_nothing_shared_yet`). (LEGACY info panel; "Report user" placement ACCEPTED P-67)

### Offline email and push (BR-120; P-68)
- AC-23 Given a message to a user who has no open web or app connection at that moment, When it is sent, Then the recipient gets the `NewMessage` email (`t_subject_everyone_u_have_new_message`) with the sender's username and a link to the conversation, in the **recipient's** language — at most once per 10 minutes per sender → recipient pair, however many messages are sent. "Saved messages" never send email. (LEGACY `:266-291`; CHANGE recipient language, legacy used the app locale)
- AC-24 Given S-101 is ON and the recipient has the mobile app installed but not in the foreground, When a message arrives, Then a push notification "New message from :username" (`t_push_new_message`) is sent without the message text, grouped per conversation; tapping it opens the conversation. (NEW P-11, ADR-007 §9; ACCEPTED P-68)

### Deleting and hiding (P-67)
- AC-25 Given the sender's own message that the recipient has not seen yet, When the sender presses "Delete" and confirms (`t_are_u_sure_u_want_to_delete_this_msg`), Then both users see `t_message_deleted` in its place and its file is no longer downloadable by them. After it was seen, "Delete" is not offered and the API refuses it. Staff with `chat.read` still see the original, marked "deleted by sender". (LEGACY unseen-only UI rule, now server-enforced; CHANGE: kept for staff instead of hard delete, Q-015; ACCEPTED P-67)
- AC-26 Given a conversation, When the user chooses "Remove from my list" (`t_remove_from_my_list`) and confirms, Then it disappears from their list only; the other person keeps it; nothing is deleted; it comes back when a new message arrives. (CHANGE: legacy "Delete conversation" did nothing, `:602-611`; ACCEPTED P-67)

### Custom offers in chat (spec 12; S-034)
- AC-27 Given S-034 is ON and a direct conversation, When the header loads, Then the user sees "Create an offer" (to send a custom offer to the other person, spec 12) and "Request an offer" (to ask the other person for one, spec 12). Offers and requests appear in the conversation as cards (price, delivery days, revisions, status, expiry) with the actions of spec 12. Given S-034 is OFF, Then both buttons are hidden and existing cards show read-only status. (NEW Q-027, Q-060a; rules in spec 12)

### Other threads (links; not duplicated)
- AC-28 Given an order, project or refund, When its buyer, freelancer or staff open it, Then its thread is shown on that item's page (gig order: 06 AC-40/AC-41; project: spec 11; custom offer: spec 12; refund/dispute: spec 13), with the same realtime delivery as the Inbox. These threads never appear in the Inbox list. (LEGACY separate threads BR-122)

### Staff visibility (Q-015, Q-083; ADR-007 §6; P-70)
- AC-29 Given a staff member with `chat.read`, When they open Admin → Conversations, Then they can search by username, full name or email of either participant and filter by thread type (direct, gig order, project, custom offer, refund) and date, and open any conversation read-only with all messages (including deleted and hidden ones, marked) and attachments. (LEGACY admin list and viewer; thread types NEW)
- AC-30 Given a staff member opens a conversation or downloads an attachment in the admin panel, When it happens, Then an audit entry records who, which conversation or file, when, from which IP, and an optional reason. Super-admins can list the audit entries per conversation and per staff member. Staff cannot post into direct conversations (only into refund/dispute threads, spec 13). (NEW Q-015, ADR-007 §6)
- AC-31 Given a staff member with `chat.moderate`, When they hide a message with an internal reason, Then both users see `t_message_removed_by_staff` instead of it, the original stays visible to staff, the action is audited, and "Unhide" restores it. Staff cannot delete messages. (CHANGE: legacy hard delete, `ConversationsComponent.php:203-238`; ACCEPTED P-70)
- AC-32 Given the Terms of Service and Privacy Policy pages (content in spec 17), When they are published, Then they contain the staff-review clause `t_terms_clause_staff_chat_review`; the Inbox shows the one-line notice `t_chat_staff_review_notice` under the conversation list (web) or at the top of a new conversation (mobile). (NEW Q-083; wording ACCEPTED P-71)

### Deleted users and migration (Q-065)
- AC-33 Given the other participant's account was deleted, When a conversation is shown, Then the name reads "Deleted user" without a profile link (02 P-21) and the conversation is read-only (AC-3).
- AC-34 Given the migration of legacy Chatify data, When it runs, Then every `ch_messages` message becomes a message of a direct conversation between the same two users (self-messages → "Saved messages") with its text, original time, seen state and attachment (moved to private storage, AC-10); `ch_favorites` become favourites. Legacy `conversations` / `conversation_messages` are not migrated (X-11). Delivery and refund threads are migrated by specs 06, 11, 13. (Q-065, Q-040)

---

## Business rules
- R-M1 **Who can chat** (Q-069b, BR-120, R-1.4): any active or verified user with any other active or verified user, both roles, no Premium gate. Restricted, banned, pending and deleted accounts cannot send; conversations with them are read-only.
- R-M2 **Conversation types** (ADR-007 §5): `direct` (Inbox, one per pair of users; self = Saved messages), `order_item` (spec 06), `project` (spec 11), `custom_offer` (spec 12), `refund` (spec 13). Only `direct` is listed in the Inbox.
- R-M3 **Message** (P-66): plain text ≤ 5,000 characters and/or exactly one attachment; offer/request cards are system messages created by spec 12. Server id time-ordered; client message id for idempotent retries.
- R-M4 **Attachments** (S-094…S-097, ADR-009): one per message, allowed types = S-095 ∪ S-096, size ≤ S-097; private storage, signed links for participants and `chat.read` staff; scanned before they become downloadable (ADR-009).
- R-M5 **Read state**: a message is seen when the recipient's open conversation shows it. Seen is per message and one-way (never reverts).
- R-M6 **Presence** (BR-012): online = activity or connection in the last 10 minutes; only the server sets it.
- R-M7 **Offline notification** (BR-120, fixed rule): email when the recipient has no open connection, once per 10 minutes per sender → recipient; push per P-68; never for Saved messages; recipient's language.
- R-M8 **Deletion** (Q-015, P-67): users never destroy messages. Sender "delete" = hidden for both users, only before it is seen. "Remove from my list" = per-user hide of the conversation. Staff "hide" = moderation with reason and audit. Retention = the platform's data retention (spec 16/17).
- R-M9 **Staff access** (Q-015, Q-083): permission `chat.read` (read), `chat.moderate` (hide/unhide); every open and download audited; disclosed in Terms & Privacy.
- R-M10 **Rate limit** (P-66): 30 messages per user per minute.
- R-M11 **Money**: chat never moves money. Offers created in chat follow spec 12.

## Money movements
None.

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Inbox list | `/inbox`: left column — back to home, "Messages" title, search, Favourites row, Saved messages, conversation list; staff-review notice at the bottom | Inbox tab: search bar, Favourites row, list; pull to refresh | loading (skeleton rows); empty `t_ur_contact_list_is_empty`; search empty `t_no_results_found`; error (retry); offline banner `t_chat_no_internet_access` |
| Conversation | centre column: header (back on small screens, avatar, name, online dot, star, "Create an offer" / "Request an offer" when S-034 ON), messages with date separators, typing indicator, send box (emoji, attach, text, send) | full screen: same header, messages, send box; attach opens a sheet: Camera, Photo library, Files | no conversation selected `t_no_conversation_selected_subtitle`; first message hint `t_type_something_to_start_messaging`; sending / failed (retry icon); read-only (AC-3, AC-33); connecting / connected (`t_chat_connecting` / `t_chat_connected`) |
| Info panel | right column | sheet from the header | shared photos empty `t_nothing_shared_yet` |
| Admin → Conversations (spec 16) | table with search and filters; read-only viewer with audit reason field; hide/unhide per message | – | – |

Accessibility: messages are a list with sender and time read by screen readers; ticks have text ("Sent", "Seen"); the online dot has the text `t_online`; the send box has a label; touch targets ≥ 44 px (tokens).

Key screen for design P2-C4: chat (Inbox list + conversation), web and mobile.

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `User/Everyone/NewMessage` (`t_subject_everyone_u_have_new_message`) | email | recipient without an open connection | new direct message, ≤ 1 per 10 min per sender → recipient (AC-23) | LEGACY; CHANGE recipient language |
| `t_push_new_message` | push | recipient with the app not in the foreground | new direct message (AC-24) | **NEW** (P-11), ACCEPTED P-68 |
| Unread badge | realtime | recipient | new message / seen (AC-18) | LEGACY |

No in-app notification rows are created for chat messages (LEGACY). Thread notifications for orders, projects, offers and refunds are in specs 06, 11, 12, 13. **Not carried over:** `t_u_have_new_message_from_username` (legacy `conversations` chat only, X-11).

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_messages` | Messages | შეტყობინებები |
| `t_search_in_ur_contacts` | Search in your contacts | კონტაქტებში ძებნა |
| `t_favorites` | Favorites | რჩეულები |
| `t_saved_messages` | Saved messages | შენახული შეტყობინებები |
| `t_save_messages_secretly` | Save messages secretly | გამარტივებული წვდომა (Owner may refine: "პირადი ჩანაწერები") |
| `t_you` | You | (empty in legacy ka; NEW ka value: თქვენ) |
| `t_image` / `t_attachment` | Image / Attachment | სურათი / დანართი |
| `t_type_ur_message_here` | Type your message here | დაწერეთ თქვენი შეტყობინება |
| `t_insert_emoji` / `t_attach_a_file` | Insert emoji / Attach a file | ემოჯი / ფაილის მიმაგრება |
| `t_enter_your_message` | Enter your message | შეტყობინება (Owner may refine: "შეიყვანეთ შეტყობინება") |
| `t_selected_file_extension_is_not_allowed` | Selected file extension is not allowed | არჩეული ფაილის გაფართოება შეუძლებელია (Owner may refine: "ამ ტიპის ფაილის გაგზავნა დაუშვებელია") |
| `t_selected_file_size_big` | The selected file size is too large | არჩეული ფაილის ზომა ძალიან დიდია |
| `t_type_something_to_start_messaging` | Type something to start messaging | გთხოვთ დაწეროთ შეტყობინება მიმოწერის დასაწყებად |
| `t_ur_contact_list_is_empty` | Your contact list is empty | კონტაქტების სია ცარიელია |
| `t_no_results_found` | No results found | ჩანაწერი ვერ მოიძებნა |
| `t_no_conversation_selected_subtitle` | Please select a conversation to start messaging | გთხოვთ აირჩიოთ ადრესატი მიმოწერის დასაწყებად |
| `t_chat_connected` / `t_chat_connecting` / `t_chat_no_internet_access` | Connected / Connecting... / No internet access | დაკავშირებული / მიმდინარეობს დაკავშირება... / არ არის ინტერნეტ კავშირი |
| `t_shared_photos` / `t_nothing_shared_yet` | Shared photos / Nothing shared yet | გაზიარებული ფოტოები / ჯერ არაფერია გაზიარებული |
| `t_view_profile` | View profile | პროფილის ნახვა |
| `t_download` / `t_delete` | Download / Delete | გადმოწერა / წაშლა |
| `t_are_u_sure_u_want_to_delete_this_msg` | Are you sure you want to delete this message? | დარწმუნებული ხართ, რომ გსურთ ამ შეტყობინების წაშლა? |
| `t_online` | Online | აქტიურია |
| `t_contact_me` / `t_chat_now` | Contact me / Chat now | შეტყობინების გაგზავნა / მიწერე ახლავე |
| `t_sorry_file_chat_does_not_exist` | Sorry, File does not exist in our server or may have been deleted! | უკაცრავად, ფაილი არ არსებობს ჩვენს სერვერზე! |
| `t_subject_everyone_u_have_new_message` | Your have new message (Owner may fix: "You have a new message") | თქვენ გაქვთ ახალი შეტყობინება |
| `t_delete_conversation` | Delete conversation (replaced for display by `t_remove_from_my_list`) | წაშალეთ მიმოწერა |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_contact_label` | Contact | კონტაქტი |
| `t_user_cannot_receive_messages` | This user cannot receive messages right now. | ამ მომხმარებელს ამჟამად შეტყობინების მიღება არ შეუძლია. |
| `t_conversation_read_only` | This conversation is read-only because the other account is no longer active. | ეს მიმოწერა მხოლოდ წასაკითხადაა, რადგან მეორე მხარის ანგარიში აღარ არის აქტიური. |
| `t_message_too_long` | Messages can be up to 5,000 characters. | შეტყობინება შეიძლება იყოს მაქსიმუმ 5 000 სიმბოლო. |
| `t_sending_too_fast` | You are sending messages too fast. Please wait a moment. | შეტყობინებებს ძალიან სწრაფად აგზავნით. გთხოვთ, ცოტა ხანს მოიცადოთ. |
| `t_message_sending` / `t_message_sent` / `t_message_seen` / `t_message_failed` | Sending… / Sent / Seen / Not sent. Tap to retry. | იგზავნება… / გაგზავნილია / ნანახია / ვერ გაიგზავნა. შეეხეთ ხელახლა საცდელად. |
| `t_message_deleted` | This message was deleted. | ეს შეტყობინება წაიშალა. |
| `t_message_removed_by_staff` | This message was removed by MyTask. | ეს შეტყობინება წაშალა MyTask-მა. |
| `t_remove_from_my_list` | Remove from my list | ჩემი სიიდან წაშლა |
| `t_remove_from_my_list_confirm` | The conversation will be removed from your list only. It returns if a new message arrives. | მიმოწერა წაიშლება მხოლოდ თქვენი სიიდან. ახალი შეტყობინების მიღებისას ის ისევ გამოჩნდება. |
| `t_report_user` | Report user | მომხმარებლის გასაჩივრება |
| `t_push_new_message` | New message from :username | ახალი შეტყობინება :username-ისგან |
| `t_chat_staff_review_notice` | For security and dispute resolution, MyTask staff may review conversations. | უსაფრთხოებისა და დავების გადაწყვეტის მიზნით, MyTask-ის თანამშრომლებს შეუძლიათ მიმოწერის გადახედვა. |
| `t_terms_clause_staff_chat_review` | Authorised MyTask staff may read messages, attachments and order, project and refund conversations exchanged on MyTask, for security purposes, to investigate reports, and to resolve disputes or verify agreements between users. Every access by staff is recorded. | MyTask-ის უფლებამოსილ თანამშრომლებს შეუძლიათ წაიკითხონ MyTask-ზე გაცვლილი შეტყობინებები, დანართები და შეკვეთების, პროექტებისა და თანხის დაბრუნების მიმოწერა უსაფრთხოების მიზნით, საჩივრების შესასწავლად, დავების გადასაწყვეტად ან მომხმარებლებს შორის შეთანხმებების დასადასტურებლად. თანამშრომლების ყოველი წვდომა აღირიცხება. |
| `t_create_an_offer` / `t_request_an_offer` | Create an offer / Request an offer | შეთავაზების შექმნა / შეთავაზების მოთხოვნა |
| `t_admin_conversations` | Conversations | მიმოწერები |
| `t_admin_access_reason` | Reason for opening (optional) | გახსნის მიზეზი (არასავალდებულო) |
| `t_deleted_by_sender` / `t_hidden_by_staff` | Deleted by sender / Hidden by staff | წაშალა გამგზავნმა / დამალა თანამშრომელმა |
| `t_message_seen_cannot_delete` | This message was already seen and can no longer be deleted. | ეს შეტყობინება უკვე ნანახია და ვეღარ წაიშლება. |

## Edge cases
- EC-1 Both users send at the same moment: both messages are stored; order = server time.
- EC-2 The recipient opens the conversation on web while the app is in the background: seen is set once; the sender sees "seen" once.
- EC-3 A file upload fails half way: the message is not created; the sender sees "Not sent. Tap to retry."
- EC-4 The sender deletes a message at the same moment the recipient opens it: if seen was stored first, the delete is refused with `t_message_seen_cannot_delete`.
- EC-5 A user sends 5 messages in 2 minutes to an offline recipient: one email only (AC-23); push is grouped (AC-24).
- EC-6 A user is banned mid-conversation: the other side sees the read-only state on the next load; messages already sent stay.
- EC-7 S-097 is lowered: files already sent stay; new uploads use the new limit.
- EC-8 A file type is removed from S-096: old files stay downloadable.
- EC-9 The socket connection drops: the app shows "Connecting…", sends queue locally for up to 1 minute, then show "Not sent"; missed messages are fetched by REST on reconnect (ADR-007 §4).
- EC-10 A migrated legacy message had an attachment whose file is missing on disk: the message shows `t_sorry_file_chat_does_not_exist` in place of the file.
- EC-11 A user favourites a contact who is later deleted: the favourite shows "Deleted user" and can be removed.

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-08-1 | Anyone can set any user's online status | `MessagesController.php:634-649` | AC-17, R-M6 |
| D-08-2 | "Delete conversation" says deleted but does nothing | `MessagesController.php:602-611` | AC-26 |
| D-08-3 | Seen messages can be deleted through the API although the UI hides the button; hard delete destroys evidence | `ChatApi.php:649-690`, `messageCard.blade.php:112-116` | AC-25, R-M8 |
| D-08-4 | Staff delete messages permanently; no record of staff reading chats | `Admin/Conversations/ConversationsComponent.php:203-238` | AC-30, AC-31 |
| D-08-5 | Attachments on a public URL guessable by file name | `ChatApi.php:727-731` | AC-10 |
| D-08-6 | Message ids `mt_rand + time()` can collide (R-038) | `MessagesController.php:239` | AC-6 |
| D-08-7 | Picker and server allow different file types (`psd` hidden, `rar` refused) | `sendForm.blade.php:25` vs `ChatApi.php:59-80` | AC-8 |
| D-08-8 | Offline email in the site's language, not the recipient's | `MessagesController.php:282` | AC-23 |
| D-08-9 | No length limit on messages | `MessagesController.php:222` | AC-7 |
| D-08-10 | Pusher key and secret hard-coded (R-003) | `config/chatify.php:41-42` | ADR-007 (self-hosted realtime; secrets in `.env`) |
| D-08-11 | "Chat now" on projects Premium-gated in the page only; Georgian label hard-coded | `project.blade.php` | AC-2, `t_contact_label` |

## Out of scope
- Blocking users (legacy block existed only in the removed `conversations` chat, X-11). Reporting uses the profile report of spec 02.
- Group chats, voice/video, message editing, reactions, forwarding (not in legacy).
- Filtering contact details or phone numbers from messages (not in legacy).
- AI translation of messages (vision, later).
- Notification preferences and muting (spec 15).

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-66 Message limits.** Text up to 5,000 characters (legacy had no limit); one attachment per message (legacy); Enter adds a new line as today, and Ctrl/Cmd + Enter also sends on web; at most 30 messages per user per minute against spam.
- **P-67 Deleting.** The sender can delete a message only until it is seen (legacy showed the button only then, but the server deleted seen messages too). A deleted message shows "This message was deleted" to both users and stays visible to staff as evidence (Q-015). The legacy "Delete conversation" button, which did nothing, becomes "Remove from my list": it hides the conversation for you only until a new message arrives. "Report user" is added to the chat info panel and opens the existing profile report (spec 02).
- **P-68 Offline alerts.** Email exactly as legacy (at most once per 10 minutes per sender, only when the recipient is not connected), now in the recipient's language. NEW: a push notification on mobile ("New message from …", without the text, grouped per conversation).
- **P-69 Inactive accounts.** Nobody can start a new conversation with a banned, deleted, restricted or pending account; existing conversations with them stay readable but read-only. "Saved messages" (notes to yourself) stays as in legacy.
- **P-70 Staff access.** Staff with the chat permission read conversations read-only; every opening and download is logged (who, what, when, IP, optional reason). Staff cannot write in direct chats (only in refund/dispute threads, spec 13). Instead of deleting messages (legacy), staff **hide** a message with a reason; users see "This message was removed by MyTask"; staff can unhide.
- **P-71 Terms & Privacy wording (Q-083).** Clause: "Authorised MyTask staff may read messages, attachments and order, project and refund conversations exchanged on MyTask, for security purposes, to investigate reports, and to resolve disputes or verify agreements between users. Every access by staff is recorded." (Georgian in the Texts table.) Plus a one-line notice in the Inbox: "For security and dispute resolution, MyTask staff may review conversations." Please approve or edit the wording; spec 17 publishes it in the Terms and Privacy pages.
- **P-72 Presence and typing.** Online = active in the last 10 minutes (legacy); no "last seen" time is shown; typing indicator kept (legacy Chatify).
