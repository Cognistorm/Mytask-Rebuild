# Features and business rules (as coded)
Rules are numbered BR-xxx. "Q-" = open question. Money rules are flagged [M].

## A. Auth & registration
- BR-001 Register fields: fullname (3-60), username (3-60, `^[a-zA-Z0-9_]+$`, not numeric, unique), email (rfc+dns, unique), password (8-60, must contain an uppercase letter and a digit), referral_code (optional, must exist in users.referral_code), agree_terms (accepted), reCAPTCHA (`app/Http/Validators/Main/Auth/RegisterValidator.php`, `app/Rules/UsernameRule.php`).
- BR-002 New user: status `pending` if `settings_auth.verification_required` else `active`; `level_id = 1` hard-coded; account_type not set ⇒ DB default `seller`; random 8-char referral code (`app/Livewire/Main/Auth/RegisterComponent.php:129-255`).
- BR-003 Verification: type `email` ⇒ token (uid 64) valid `verification_expiry_period` minutes, email VerifyEmail; type `admin` ⇒ admin email PendingUser (`RegisterComponent.php` 178-196). Email link sets status active + email_verified_at (`app/Livewire/Main/Auth/VerifyComponent.php`).
- BR-004 Login by email+password (+reCAPTCHA, remember me); only status active|verified may stay logged in (`app/Livewire/Main/Auth/LoginComponent.php`). No rate limit for users (admin login: 2 attempts then IP ban counter, `app/Livewire/Admin/Auth/LoginComponent.php:19,222-230`; IP banned when attempts ≥3, `app/Http/Middleware/isIpBanned.php:26`).
- BR-005 Passwords bcrypt, 10 rounds (`config/hashing.php:18,32`) — portable to the new platform.
- BR-006 Social login (Google/Facebook/GitHub/LinkedIn/Twitter): creates/links user by email+provider_id, status active, verified, level 1; refuses if email exists with a password or other provider (`app/Livewire/Main/Auth/Social/Google/CallbackComponent.php`). Does not check banned status.
- BR-007 Password reset by email token, expiry `password_reset_expiry_period`.
- BR-008 Restricted users (`is_restricted`) are redirected to `/restricted` for every Main route (`app/Http/Middleware/Restricted.php:27-31`) and can submit an appeal with files.

## B. Profiles, dual role, levels
- BR-010 Two dashboards: client `/account/*` (layout buyer-app) and freelancer `/seller/*` (layout seller-app, requires account_type seller). Header links to both; no explicit toggle component.
- BR-011 `start_selling` switches buyer→seller, sets first seller level, sends YouBecameSeller (`app/Livewire/Main/Become/SellerComponent.php:144-163`).
- BR-012 Online = cache key for 10 min after any request (`app/Http/Middleware/UserLastActivity.php:21-22`).
- BR-013 Availability: seller can set "unavailable until"; cron removes it after the date (`app/Console/Commands/UnavailableSellers.php`); unavailable sellers cannot receive custom offers.
- BR-014 Levels: 3 conflicting implementations — correct in helper `check_user_level` (`helpers.php:2510+`, min ≤ count ≤ max), inverted in middleware `UpgradeLevel.php:40-45` and command `UpgradeUserLevel.php:50-53` (Q-014).
- BR-015 Client username on project pages is masked (first/last quarter visible) unless viewer has Premium or is the owner (`app/Livewire/Main/Project/ProjectComponent.php:362-395`).

## C. Gigs (services)
- BR-020 Gig create wizard (overview, pricing, requirements, gallery). Title/description: `ka` required (Georgian letters, no Latin), `en` optional (Latin only, no Georgian) (`app/Http/Validators/Main/Create/OverviewValidator.php`, `app/Rules/GeorgianTextOnly.php`, `EnglishTextOnly.php`). Category+subcategory+childcategory required. Price `^\d+(\.\d{1,2})?$`, max 10 chars; delivery_time ∈ {0,1,2,3,4,5,6,7,14,21,30} days; upgrades have price/title/extra_days (`PricingValidator.php`).
- BR-021 Free users may have at most 1 non-deleted gig; the 2nd requires an active subscription (redirect to /subscription?gigs=true) (`app/Livewire/Main/Create/CreateComponent.php:661-667`).
- BR-022 New gig status `active` if `auto_approve_gigs` else `pending` (admin approves → GigPublished; reject with reason → YourGigNeedsChanges).
- BR-023 Premium users' gig cards get a yellow border (`resources/views/livewire/main/cards/gig.blade.php:1`).
- BR-024 Gig slug = slug(title.ka) + '-' + uid (SEO URL).

## D. Gig orders (cart → checkout → escrow → delivery)
- BR-030 [M] Cart in session; own gigs removed from cart (`CheckoutComponent.php` (CR) 81-160).
- BR-031 [M] Subtotal = Σ(gig price × qty + checked upgrades × qty). Tax: if `enable_taxes`, percentage of subtotal or fixed (`CheckoutComponent.php` (CR) 401-477). Total = subtotal + tax + gateway fee.
- BR-032 [M] BOG adds a hard-coded 2.5% of subtotal on top of the configured gateway fee (`CheckoutComponent.php` (CR) 727-730; `UnifiedCheckoutComponent.php:259-261`).
- BR-033 [M] Commission per item only when `commission_from === 'orders'`: percentage of item_total or fixed; `profit_value = item_total − commission` (`CheckoutComponent.php` (CR) 4727-4793). `commission_from='both'` yields 0 commission on orders (not handled).
- BR-034 [M] Wallet payment: requires balance_available ≥ total; buyer available −= total, purchases += total; seller pending += profit; invoice paid; gig orders_in_queue++ (`CheckoutComponent.php` (CR) 4577-4960).
- BR-035 [M] BOG payment: order_id `b_`+uid32; creates Order+Items+Invoice(pending) BEFORE payment; admin email NewPayment; on `/success` marks invoice paid and seller pending += profit (`CheckoutComponent.php` (CR) 1247-1264, 5063-5345; `PaymentBogController.php:31-95`).
- BR-036 Buyer must send "order details" (requirements text) before the seller can start; only when item pending and invoice paid (`app/Livewire/Main/Account/Orders/OrdersComponent.php:164-205`; seller check `app/Livewire/Main/Seller/Orders/OrdersComponent.php:340-360`).
- BR-037 Seller "start" → status proceeded, expected_delivery_date = now + gig.delivery_time + Σ upgrade extra_days (`Seller/Orders/OrdersComponent.php:340-433`).
- BR-038 [M] Cancel while `pending`: by seller (only if invoice paid) or buyer (no invoice check). Seller pending −= profit; buyer available += item total_value (tax/fees not returned) (`Seller/Orders/OrdersComponent.php:175-230`; `Account/Orders/OrdersComponent.php:209-290`).
- BR-039 Delivery: seller uploads work (+message) when proceeded/delivered → status delivered, delivered_at (`app/Livewire/Main/Seller/Orders/Options/DeliverComponent.php:63-335`); resubmit allowed (no revision limit).
- BR-040 [M] Completion: buyer clicks complete on delivered item → is_finished; seller pending −= profit, available += profit; gig counter_sales++; pending refunds closed; redirect to review (`app/Livewire/Main/Account/Orders/Options/FilesComponent.php:266-340`). No automatic completion is scheduled (`orders:complete` not in Kernel) (Q-009).
- BR-041 Buyer can delete an unpaid (invoice pending) order; code also subtracts seller pending (`Account/Orders/OrdersComponent.php:367-400`) — bug.
- BR-042 Reviews: only for finished delivered gig items, rating 1-5, message ≤800, one per item; recalculates gig rating avg (`app/Livewire/Main/Account/Reviews/Options/CreateComponent.php`).

## E. Projects & proposals (bids)
- BR-050 Projects feature toggle `projects_settings.is_enabled`; who_can_post buyer|seller|both.
- BR-051 Post: ka title (3-100, Georgian+digits+`-_.,!?()`), ka description (≥10) required; en optional (Latin-only regex); thumbnail image required (≤ max_image_size MB); category; budget type fixed|hourly; min < max price (`app/Http/Validators/Main/Post/ProjectValidator.php`; `Post/ProjectComponent.php` (CR) 652-1000). pid = random 6 digits.
- BR-052 Status on create: `pending_payment` if promotion plans selected, else `active` if auto_approve_projects else `pending_approval` (`Post/ProjectComponent.php` (CR) 1005-1070). Promotions (featured/urgent/highlight/alert) create a `project_subscriptions` payment.
- BR-053 On create, all active gig-owners in the gig category with the same slug as the project category get NewProjectInCategory email (even if project pending) (`app/Services/Project/ProjectNotificationService.php`).
- BR-054 English locale shows 404 for projects without `en` translation (`ProjectComponent.php:~92-99`). Non-owners get 404 for pending_approval|pending_payment|hidden|rejected.
- BR-055 Proposal: only account_type seller; project must be active, not yet awarded; not own project; one proposal per freelancer per project; amount must be within budget_min..budget_max; days int; message ≤3500 (`ProjectComponent.php:416-829`, `app/Http/Validators/Main/Project/BidValidator.php`).
- BR-056 Proposal status: pending_payment if premium bidding upgrades chosen (sponsored/sealed/highlight; only one sponsored per project), else pending_approval if !auto_approve_bids, else active (`ProjectComponent.php:830-1085`).
- BR-057 Viewing the bids list requires Premium (or owner/admin) (`ProjectComponent.php:274-300`); sealed bids hide amount/days/message except to owner, bidder, admin (`app/Livewire/Main/Cards/Bid.php:185-200`). The "send proposal" button is Premium-gated in the Blade view only; server does not check (Q-020).
- BR-058 Award: owner accepts a bid (project active, bid active) → un-awards any other awarded bid, sets is_awarded, awarded_date, project.awarded_bid_id/awarded_freelancer_id; notify ProjectAwarded (`Cards/Bid.php:480-690`); revoke possible (`Cards/Bid.php:708+`).
- BR-059 Freelancer accept/reject award: accept → project `under_development`, bid accepted, creates milestone(status request, amount = bid) (`app/Livewire/Main/Seller/Projects/ProjectsComponent.php:280-360`); reject requires reason_1..8, bid hidden, project un-awarded (`:156-270`).
- BR-060 Award expiry: awarded-but-not-accepted bids are un-awarded after **24h** (daily cron; description says 36h; live page says 48h) (`app/Console/Commands/ExpiredAwardedBids.php:23,49`) (Q-005).

## F. Project escrow / milestones [M]
- BR-070 Client pays the awarded amount via `/checkout/{projectUid}/project` or `/account/projects/payments/{uid}`: wallet or BOG. Employer commission = commission_from_publisher (fixed or % of bid), freelancer commission = commission_from_freelancer (`UnifiedCheckoutComponent.php:491-560, 690-752`; `PayComponent.php:747-860`). Effectively ONE milestone per project (`ProjectMilestone::where(project_id)->first()`).
- BR-071 On funding: milestone funded; freelancer pending += (amount − freelancer_commission); project under_development → pending_final_review. BOG path also adds (amount + employer_commission) to CLIENT balance_pending; wallet path does not (`PaymentBogController.php:128-178` vs `UnifiedCheckoutComponent.php:549-559`).
- BR-072 Delivery allowed only when project pending_final_review|completed; stores project_work_deliveries (delivered) (`Seller/Projects/Options/DeliverComponent.php:40-230`).
- BR-073 Release: client releases funded milestone → paid; freelancer available += amount − freelancer_commission, pending −= same; project completed when paid ≥ bid amount (`PayComponent.php:1265-1320`). Older UI also decrements client pending (`Account/Projects/Options/MilestonesComponent.php:1234-1310`).
- BR-074 Freelancer can "request" milestones; client can reject milestone requests (RejectMilestone).
- BR-075 Commission values stored on the milestone at freelancer-accept are swapped and not %-converted (`Seller/Projects/ProjectsComponent.php:327-329`) and are NOT recomputed at payment when the milestone already exists (Q-006).

## G. Refunds & disputes [M]
- BR-080 Gig refund request: buyer, item not finished, status pending|proceeded|delivered, and (delivered OR expected_delivery_date passed); one per item (`app/Livewire/Main/Account/Refunds/Options/RequestComponent.php:32-60`).
- BR-081 Seller accepts → item refunded+finished, buyer available += item total_value, seller pending −= profit (`app/Livewire/Main/Seller/Refunds/Options/DetailsComponent.php:201-250`); declines → rejected_by_seller.
- BR-082 Pending refunds with no seller response for 2 days are auto-set `rejected_by_seller` (hourly) — gig and project (`app/Console/Commands/AutoRejectStaleRefunds.php:31-41`).
- BR-083 Buyer can close a pending refund, or raise dispute after seller rejection (request_admin_intervention) (`Account/Refunds/Options/DetailsComponent.php:217-310`).
- BR-084 Admin resolves dispute: accept → refunded to buyer wallet; decline → rejected_by_admin, seller paid (pending→available), item finished (`app/Livewire/Admin/Refunds/Options/DetailsComponent.php:80-240`).
- BR-085 Project refund: client can request when a milestone is funded/paid and (work delivered & pending_final_review, or delivery time bid.days after acceptance expired) (`PayComponent.php:1372-1410`, `app/Enums/ProjectRefundStatus.php`). Freelancer accept → client available += amount+employer_commission, milestones refunded, project completed. Admin accept/decline similar but inconsistent (see risks).
- BR-086 Unblock money request (freelancer asks admin to release escrow): order item delivered & unfinished, or project pending_final_review without refunded milestones; allowed only 72h after latest delivery; one pending per resource; amount = order profit or project bid amount (gross) (`app/Livewire/Main/Seller/UnblockRequests/CreateComponent.php:41-240`). Admin approve (two different implementations, see risks).

## H. Custom offers [M]
- BR-090 Client sends offer from a freelancer profile (freelancer must be seller and available): budget, delivery time, message, attachments; buyer fee & freelancer fee from settings_publish (fixed or %); admin approval if configured; expires after custom_offers_expiry_days (`app/Livewire/Main/Profile/ProfileComponent.php:437-670`).
- BR-091 Freelancer accept/reject; client funds (wallet or BOG) budget+buyer_fee; freelancer uploads work; client (or admin) releases → freelancer available += budget − freelancer_fee; freelancer cancel refunds buyer budget+buyer_fee to wallet (`Seller/Offers/OffersComponent.php:245-620`; `Account/Offers/OffersComponent.php` (CR) 1388-1750; `Admin/Offers/OffersComponent.php:326-365`).

## I. Wallet, deposits, withdrawals [M]
- BR-100 Deposit (fill balance) via BOG within gateway min/max; on success balance_available += amount (`Account/Deposit/DepositComponent.php:~660-730`; `PaymentBogController.php:180-203`).
- BR-101 Withdrawal: requires payout settings (offline bank text; PayPal disabled `config/payouts.php`); amount ≤ available; ≥ min_withdrawal_amount; no other pending request; period since last PAID withdrawal ≥ 24h/168h/720h (daily/weekly/monthly); fee only if commission_from==='withdrawals'; record amount = requested − fee; user available −= requested, withdrawn += requested (`Seller/Withdrawals/CreateComponent.php:569-800`). Admin marks paid (manual payout) or rejects (refund amount+fee) (`Admin/Withdrawals/WithdrawalsComponent.php:67-150`). No Premium exemption (live says Premium 0%) (Q-004).

## J. Subscriptions, points, referrals
- BR-110 Plans: Standard (free: 1 listing, chat) / Premium 9.99 GEL/month or 99.99/year (unlimited listings, highlighted gigs, top offers, bid on projects, view bids, contact project authors) (`SubscriptionPlanSeeder.php`).
- BR-111 Subscribe: BOG payment + `saveSubscription` (card saved for recurring); on success subscription created (month/year) using session data, card stored in user_payment_methods (`app/Http/Controllers/SubscriptionController.php`, `app/Services/Subscription/SubscriptionService.php:97-206`).
- BR-112 Auto-renew every minute for ended, not-canceled subscriptions: charge saved card via BOG "subscribe" endpoint if card matches; success → extend; failure → cancel (`app/Console/Commands/ProcessSubscriptionPayments.php`).
- BR-113 Premium check = subscription not canceled and ends_at > now, cached 60 s (`app/Models/User.php:326-334`).
- BR-114 Points: 100 points = 1 month Premium (UI, `app/Livewire/Main/Subscription/SubscriptionComponent.php:88`); server deducts the client-sent `points` (≥1) (`app/Http/Controllers/Main/SubscriptionController.php:16-65`).
- BR-115 Referral: signup with a user's referral code creates pending referral; on verification (or immediately if no verification) referrer gets 10 points + ReferralEarning; referral code benefits (promo) can gift Premium N months (`RegisterComponent.php:257-310`, `app/Enums/ReferralEventType.php:19`, `app/Services/Referral/ReferralBenefitService.php`).

## K. Chat & messaging
- BR-120 Active chat = Chatify at `/inbox` (Pusher realtime, attachments per live_chat_settings). Offline/away recipient gets NewMessage email at most once per 10 min per sender (`app/Http/Controllers/Chat/MessagesController.php:165-300`). Chat is available to all users (not Premium-gated in code), although "contact project author" button is Premium-gated in the view.
- BR-121 Legacy conversations (`/messages/{id}`, block/unblock) remain in code; `/messages/new/{username}` redirects to `/inbox/{uid}`.
- BR-122 Order/project delivery threads have their own message tables (order_item_work_conversation, project_work_conversations) and refund threads (refund_conversation, project_refund_conversations) with realtime channels.

## L. Search, categories, SEO, content
- Gig categories 3 levels with translated names/content; project categories + skills; `/search`, `/hire/{keyword}`, `/sellers`; CMS pages; blog (disabled live); sitemap cron; per-page SEO via seotools; newsletter with double opt-in.

## M. Admin
- /dashboard: moderation (gigs, portfolios, projects, bids, offers, reviews, comments, verifications, reports), money (invoices approval, orders, refunds, project refunds, unblock requests, withdrawals, user transactions/deposits), users (create/edit/restrict/message/trash, set balance directly — `Admin/Users/Options/EditComponent.php:228`), catalog, settings, gateways, languages & translation editor (writes lang files), system (cache, maintenance, reset, crontab), analytics home (tracker_* geo/browser/platform/device, net income).
- /console (Filament): users & referrals, subscriptions (create/gift/cancel), plans, referral code benefits, projects, project categories.

## N. Analytics
- Tracker middleware: once per 15 min per browser, queued job geo-locates IP via findip.net and parses UA/device/referrer into tracker_* (`app/Http/Middleware/Tracker.php`, `app/Jobs/TrackingService.php:101-108`). Gig visits use ip-api.com (`app/Jobs/Main/Service/Track.php:268`).
