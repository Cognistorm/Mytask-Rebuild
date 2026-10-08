# Slice 3 (spec 04 Gigs): Owner click-through, ROADMAP 4.3.22

About 40 minutes. Web https://mytask.1kk.ge · Admin https://mytask.1kk.ge/admin (login `owner`) · test inbox
https://mytask.1kk.ge/__mail/ (emails, login codes) · App: Expo Go with `EXPO_PUBLIC_API_URL=https://mytask.1kk.ge/api/v1`
in your `.env` (SETUP-LOCAL §4).

**Deployed:** 2026-10-08, commit `342fadac` (branch `feat/gigs`, CI green, PR into `main` opened by you).

**You need two website accounts:** a **seller** (creates gigs) and a **buyer** (favourites, reports). Sign up at
`/auth/register`; the confirmation emails land in the test inbox. Use a second browser or a private window for the
buyer.

**Settings that matter here** (admin → Settings):
- S-070 "auto-approve gigs" is **OFF** by default: a new gig waits for staff.
- S-001: a Standard user may have **1** gig. To try "You may also like" and the lists with several gigs, raise it
  to 3 for the test and set it back afterwards.
- S-080 documents ON, S-077 at most 10 images, S-078 5 MB per image, S-082 10 MB per PDF.

**Known on staging:** no virus scanner (`SCAN_PROVIDER=none`), so uploads are accepted unscanned. Countries and cities
in the analytics show "unknown": the DB-IP file is not installed on staging (ask, and it can be added). Orders, reviews, "Add to cart" and
"Contact seller" come in later slices, so those parts are hidden or empty.

Tick each line. Anything that looks wrong: write one line under "Notes" (what, where, what you expected).

## 1. Seller: create a gig (web, wide window)
- [ ] Signed in as the seller, header → "განცხადების დამატება" (or `/create`). Guests are sent to login first; the old
      address `/post/service` jumps to `/create`.
- [ ] The wizard has the blocks Overview (ზოგადი მიმოხილვა), Pricing (ღირებულება), Upgrades, FAQ, Gallery (გალერეა)
      and the SEO dialog, plus the side summary with a progress bar.
- [ ] Type Latin letters in a Georgian field, or Georgian in an English one: the field says which characters are not
      allowed. Leave required fields empty and press publish: every error shows at once, at its field.
- [ ] Gallery: a thumbnail, 2–3 images (JPG/PNG) and a PDF. Each file shows its progress; reorder the images with
      "Move left / right"; remove one. The hint under the images says the maximum number of files; under the PDFs:
      "ფაილის სახელს ყველა ხედავს. ნუ მიუთითებთ მასში პირად მონაცემებს."
- [ ] Add one upgrade and one FAQ; fill the SEO title and description.
- [ ] Publish: the success screen says the gig waits for review (S-070 OFF). A staff email arrives in the test inbox
      (EV-19).
- [ ] Open the wizard again with the limit at 1: it does not open; it shows the plan limit and "Upgrade to Premium".

## 2. Staff: moderation (admin)
- [ ] Sidebar → "განცხადებები" (Gigs). Tabs Pending / Active / Rejected / Deleted; your gig is in Pending, oldest first.
- [ ] Open it, **Reject** with a reason. The seller gets an email with the reason (EV-21), greeted by their full name.
- [ ] Seller: My gigs (`/seller/gigs`) shows "საჭიროა ცვლილებები" with the reason; Edit shows the reason on top.
      Change something, "ცვლილებების შენახვა": back to Pending.
- [ ] Staff: **Publish**. The seller gets the "published" email (EV-20). A second staff click on an already decided
      gig says it was already decided.

## 3. Everyone: the gig page (web)
- [ ] As a guest, open the gig from its category page or search. `/service/<slug>-<id>`; an old slug jumps to the
      current one.
- [ ] Gallery: main image with previous/next and "2 / 3", thumbnails, the arrow keys, click → large view (Esc
      closes); swipe on a phone.
- [ ] Tabs Description / FAQ / Reviews (empty: no reviews yet) / Documents (the PDF **downloads**, it does not open in
      the browser). On a narrow window the tabs become sections with headings.
- [ ] Purchase box: price, delivery days, revisions, the upgrade. "Share" (გაზიარება) opens the share dialog.
- [ ] "Report" (გასაჩივრება): a guest is asked to log in; the buyer can send a report (6–500 characters), and a
      second report says it was already sent. The staff email arrives (EV-22).
- [ ] Favourite heart: a guest is asked to log in; the buyer can save and unsave it; the seller has no heart on their
      own gig.
- [ ] With 2+ active gigs in the same category: "რეკომენდირებული განცხადებები" (You may also like) under the page,
      with arrows; on a 390 px window the heading wraps beside the arrows.
- [ ] `/en/service/...` shows the English texts; a gig without English shows the Georgian text with the note.

## 4. Hearts on card lists (web)
- [ ] As the buyer, the heart sits on every gig card: home, Explore, a category page, search, "You may also like",
      the seller's profile. Toggling it on one list shows the same state on the others after reload.
- [ ] Buying → "რჩეულები" (`/account/favorite`): the saved gig is listed (on a phone as cards); remove works; empty
      list shows its message.

## 5. Seller: My gigs and analytics (web)
- [ ] `/seller/gigs`: thumbnail, title, price, status, orders in queue; View, Edit, Analytics, Delete (with a confirm).
- [ ] Open the gig page a few times as the buyer and a guest (the seller's own views do not count; each visitor counts
      once a day). Analytics: clicks, impressions (from search), devices, browsers, systems, referrers, countries,
      cities, the "IP Geolocation by DB-IP" credit; others get "Page not found" for this address.
- [ ] Delete a gig: it leaves My gigs and the public lists.

## 6. Staff: remove and restore (admin)
- [ ] On an active gig, **Remove** with a reason. The gig page answers "Page not found"; its images and PDF stop
      opening (copy an image link before you remove it to see that).
- [ ] Deleted tab → **Restore** (within 30 days): the gig is active again, the images and PDF work again, and the
      seller gets the "restored" email (EV-130, new). Restoring over the seller's gig limit is refused.

## 7. App (Expo Go)
- [ ] Gig screen: swipe gallery, FAQ, reviews, documents, "You may also like", Share (native sheet), heart, ⋯ Report.
- [ ] Create a gig in the app: 5 steps (Overview, Pricing, Extras, Gallery with camera or photo library + PDFs,
      Review & publish). ✕ or Android Back asks "Discard changes?"; text and running uploads survive Back / Next.
- [ ] Edit from the gig screen ("განცხადების რედაქტირება") opens the app editor; My gigs and Favourites lists work.
- [ ] My gigs → Analytics still opens the website (the app screen comes in 4.3.23).

## 8. Same data on both
- [ ] A gig created in the app shows on the website and the other way round; a favourite saved in the app shows on
      the website.

## Decision
- [ ] **Approve slice 3** → merge PR `feat/gigs` → `main` (or after 4.3.23, the app analytics screen, if you want it
      in the same PR).

## Notes
-
