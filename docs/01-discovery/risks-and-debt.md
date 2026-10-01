# Risks and technical debt
## Critical
- R-001 Hard-coded BOG OAuth client credentials in `app/Services/Bog/BogPayment.php:133` [SECRET: BOG_CLIENT_ID/BOG_CLIENT_SECRET]. Must be rotated; they are in every copy of the repo.
- R-002 Hard-coded Binance API key/secret + an automated leveraged futures trading bot inside the marketplace codebase (`app/Console/Commands/BinanceTradingBotCommand.php:13-14`) [SECRET: BINANCE_API_KEY/SECRET]. Rotate; remove.
- R-003 Hard-coded Pusher key/secret (`config/chatify.php:41-42`) and findip key (`config/findip.php:9`). Rotate.
- R-004 BOG return handler `/success` is unauthenticated, trusts `key`/`type` query params, never verifies payment status with BOG, and is not idempotent: `fill_balance` credits wallet on every hit (`app/Http/Controllers/Main/PaymentBogController.php:180-203`); order success re-increments seller pending (`:51-70`); milestone/offer marked funded (`:97-178`). A user can top up without paying by calling `/success?key=<own order id>&type=fill_balance`. BOG `callback_url` points to `/callback` which has no route (`BogPayment.php:14`).
- R-005 Buyer can cancel an unpaid (BOG invoice pending) order and receive wallet credit of item total (`app/Livewire/Main/Account/Orders/OrdersComponent.php:209-241`; seller-side cancel does check invoice, `Seller/Orders/OrdersComponent.php:183`).
- R-006 Points purchase trusts client-supplied `points` (min 1) ⇒ Premium for 1 point (`app/Http/Controllers/Main/SubscriptionController.php:16-50`).
## High
- R-010 Public `/update` runs `queue:clear` and writes config before any check; can run migrations if `updating` file exists (`routes/web.php:24-34`, `app/Http/Controllers/Update/UpdateController.php`).
- R-011 Public `/tasks/queue`, `/tasks/schedule` run artisan (`routes/web.php:47-63`); `/te` debug route.
- R-012 Escrow ledger inconsistencies (money correctness): client locked funds tracked in `balance_pending` only on BOG path; wallet path doesn't (`UnifiedCheckoutComponent.php:549-559` vs `PaymentBogController.php:136-150`); PayComponent release doesn't reduce client pending (`PayComponent.php:1279-1290`) while MilestonesComponent does (`:1280`); admin milestone release marks paid without crediting freelancer (`app/Livewire/Admin/Projects/Milestones/MilestonesComponent.php:432-480`); admin project refund accept uses first milestone regardless of status and doesn't reduce client pending, decline credits freelancer available without reducing pending (`Admin/ProjectRefunds/Options/DetailsComponent.php:65-200`); two admin unblock approvals disagree (list page moves pending→available and completes; details page only adds available ⇒ double-pay possible) (`Admin/UnblockRequests/UnblockRequestsComponent.php:58-140` vs `Options/DetailsComponent.php:62-125`); project unblock amount = gross bid amount (`Seller/UnblockRequests/CreateComponent.php:133`).
- R-013 Milestone commissions swapped and not %-converted at freelancer accept (`Seller/Projects/ProjectsComponent.php:327-329`), reused at payment.
- R-014 Deleting an unpaid BOG order subtracts seller pending that was never added (`Account/Orders/OrdersComponent.php:367-400`) ⇒ negative pending possible.
- R-015 Admin order delete refunds `subtotal_value` (non-existent column ⇒ 0) (`Admin/Orders/OrdersComponent.php:101`).
- R-016 BOG gig order success eager-loads `gig:id,gig_id,...` (non-existent column) and items without gig_id ⇒ probable SQL error / queue counters not updated (`PaymentBogController.php:55-61,84`).
- R-017 Balances stored as varchar with float arithmetic and non-atomic read-modify-write in most paths (race conditions, rounding).
- R-018 Project checkout has no ownership check — any logged-in user can fund someone's project milestone, becoming `employer_id` (`UnifiedCheckoutComponent.php:76-87, 727`).
- R-019 Premium bidding gate only in Blade; server `next()` allows any seller (`ProjectComponent.php:416-450`).
- R-020 Social login ignores banned/pending status (`Auth/Social/*/CallbackComponent.php`).
- R-021 `error_log` in repo exposes DB username and server paths; deployment root = public_html with project files beside index.php ⇒ `.env`, `error_log`, `composer.json` may be web-reachable (not tested) (Q-042).
- R-022 `Access-Control-Allow-Origin: *` on all web responses (`app/Http/Middleware/XFrameHeaders.php:24`).
## Medium
- R-030 Level assignment: 3 implementations, 2 inverted (`UpgradeLevel.php:40-45`, `UpgradeUserLevel.php:50-53` vs `helpers.php:2510+`); registration sets level_id=1 ("New buyer") for sellers.
- R-031 Unscheduled crons: `orders:complete` (also wrong window `delivered_at >= now-1h`, `CompleteOrders.php:33-39`), `expired:projects` (promotions never expire).
- R-032 Award expiry 24h in code vs 36h description vs 48h live (`ExpiredAwardedBids.php:23,49`).
- R-033 Enum/schema drift (milestone 'delivered', DRAFT, level/subcategory translation FKs to categories, projects NOT NULL columns, missing `sliders` migration).
- R-034 Duplicate Filament panels both id/path `console` (`AdminPanelProvider.php:28-29`, `ConsolePanelProvider.php:28-29`); `canAccessPanel` always true.
- R-035 Admin route `edit/bog` bound to IyzicoComponent (`routes/admin.php:632`).
- R-036 Upgrades persistence bug uses stale `$upgrade` instead of `$value` in checkout loops (`CheckoutComponent.php` (CR) wallet()/bog()).
- R-037 Refund redirect to non-existent `account/refunds/{uid}` (`Account/Refunds/Options/RequestComponent.php:44`); `/account/profile` linked but not routed.
- R-038 Chatify message id = `mt_rand + time()` (collision risk) (`Chat/MessagesController.php` send()).
- R-039 ID verification images stored under `public/storage/verifications` (web-accessible by filename) despite controller checks.
- R-040 ip-api.com over plain HTTP; tracker sends every visitor IP to 3rd parties (privacy/GDPR-like concern).
- R-041 Subscription success depends on the browser session (`SubscriptionService.php:139-168`) — lost if session changes; no webhook.
- R-042 `sitemap:generate` every minute loads all gigs/projects; live `/sitemap.xml` 404.
- R-043 No user login throttling; reCAPTCHA optional.
- R-044 ~50 CR-only line-ending files (diff/review tooling breaks).
## Low / dead code
- 28 unused payment gateways + callbacks + settings tables; legacy conversations chat; commented controller routes (`routes/web.php:783-815`); `resources/views/livewire/admin/subcategories copy/`; `Welcome` notification unused; `companies`, `jazzcash_transactions` tables; `regular` empty file; Riverr defaults in seeders; empty test suite; Vite + Mix both configured; Sanctum unused; `hidden` BOG payload junk (`total_discount_amount: 7`, `delivery.amount: 5`, dummy basket `product123`, `BogPayment.php:23-33`).
