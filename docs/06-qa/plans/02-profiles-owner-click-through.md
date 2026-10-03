# Slice 1 (spec 02 Profiles and dashboards): Owner click-through, ROADMAP 4.1.30

About 30–40 minutes. Start the platform as usual (`pnpm local`, SETUP-LOCAL §3). Emails arrive in Mailpit at http://localhost:8025.
Web: http://localhost:3100 · Admin: http://localhost:3200 · App: Expo Go (SETUP-LOCAL §4).

Tick each line. Anything that looks wrong: write one line under "Notes" at the bottom (what, where, what you expected).

## Web: your own account (signed in)
- [ ] Log in. The account menu (top right) → **Edit profile** (`/account/profile`).
- [ ] Change the photo (a non-square photo is fine: it shows as a square). Remove it: the first letter shows. Put one back.
- [ ] Headline, About me, Skills, Languages: add and edit one of each. Each block shows its own "saved" message.
- [ ] Availability: set a date (from tomorrow) and a message; your public profile shows the notice; Remove ends it.
- [ ] Dashboard: switch **Buying ↔ Selling**. Log out and in again: it opens on the side you chose last.
- [ ] Selling → **ჩემი ნამუშევრები** (Portfolio) → add a work with a thumbnail and 2 gallery photos. It shows "Pending".
- [ ] Account menu → **Settings**: change the city (needs your password). On a phone-width window the form comes first, the account card below it (QA BUG-03).
- [ ] Change your email to another address: the banner says a link was sent; open it in Mailpit; the old address also got a notice.
- [ ] **Verification centre**: send an ID card (front, back, selfie). The status shows "pending" with your three documents (Download works).
- [ ] Theme: in the account card choose Dark, then Light.

## Admin (http://localhost:3200)
- [ ] **Portfolio** queue: the work is in "Pending". Reject it with a reason that ends with a full stop, e.g. "Images are too dark."
- [ ] Back on the web, the work shows "Not approved. Reason: Images are too dark. …" (one full stop, QA BUG-04); the email in Mailpit too.
- [ ] Edit the work and save: it goes back to Pending. Approve it in the admin queue: it is public now.
- [ ] **KYC** queue: open the documents (they open only on click), Approve. On the web the verification centre says verified; the profile shows "ID verified".

## Web: as a visitor
- [ ] In a private window open `/profile/<your username>`: card, about, portfolio preview, skills. Share opens Facebook / X / LinkedIn / WhatsApp + Copy link (your DEV-P1 decision).
- [ ] "Report user" asks a guest to log in. Log in as a second account: the report is sent, and the admin email reaches Mailpit.
- [ ] Open `/profile/nobody_here_xyz` and `/some/unknown/page`: the Georgian "გვერდი ვერ მოიძებნა" page with "მთავარ გვერდზე დაბრუნება" (QA BUG-01). The same under `/en/...` is in English.
- [ ] Your work page `/profile/<you>/portfolio/<work>` loads with all photos.

## App (Expo Go, SETUP-LOCAL §4 steps 10–16)
- [ ] Steps 10–12: Dashboard tab with the Buying / Selling switch; View profile; Edit profile (photo from camera and gallery, availability sheet).
- [ ] Steps 13–14: open a work and swipe the photos; Selling → "ჩემი ნამუშევრები": add a work from the phone.
- [ ] Steps 15–16: Account settings; Verification centre (the selfie opens the front camera).
- [ ] What you changed on the web shows in the app, and the other way round.

## Decision
- [ ] **Slice 1 approved** (ROADMAP 4.1.30 ticked; next: 4.2 Categories and search), or
- [ ] **Not yet**: the notes below go to 4.1.28 as new fixes.

Notes:
-
