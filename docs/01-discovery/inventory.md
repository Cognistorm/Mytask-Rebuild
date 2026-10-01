# Legacy inventory — MyTask.ge
Status: complete (Phase 1). Source: `legacy/APP` (read-only). Line numbers for CR-only files are counted by CR.

## 1. What it is
- Base product: CodeCanyon "Riverr – Freelance Services Marketplace", `version => 1.3.4@beta` (`legacy/APP/config/global.php:9-11`). Heavily customised by several developers for MyTask (BOG payments, subscriptions/points/referrals, project escrow, refunds, unblock requests, Georgian-first content).
- App name `MyTask`, timezone `Asia/Tbilisi`, framework default locale `en` (`legacy/APP/config/app.php:18,73,86,99`); runtime default language comes from DB `settings_general.default_language` (`legacy/APP/app/Http/Middleware/SetLocale.php:55`).

## 2. Stack & versions
| Layer | Tech | Evidence |
|---|---|---|
| Language | PHP ^8.1 | `legacy/APP/composer.json` |
| Framework | Laravel 10.50.0 | `legacy/APP/composer.lock:4629` |
| UI | Livewire 3.7.6 (304 components), Blade (1,835 views), Alpine.js 3, WireUI, Flowbite, Tailwind 3.3 | `composer.lock:6142`, `package.json` |
| Admin UIs | (a) custom Livewire admin at `/dashboard`; (b) Filament 3.3.47 at `/console` | `app/Providers/RouteServiceProvider.php:39-41`, `config/global.php:5`, `app/Providers/Filament/AdminPanelProvider.php:28-29` |
| Chat | munafio/chatify 1.6.3 (Pusher) at `/inbox` | `config/chatify.php:24-33`, `composer.lock:7167` |
| Vue | Vue 3 — 2 components only (legacy project post/edit forms) | `resources/js/components/main/...` |
| Build | Laravel Mix (active; `mix-manifest.json`) AND Vite config (both present) | `webpack.mix.js`, `vite.config.js` |
| DB | MySQL (enum/`ALTER TABLE ... MODIFY` statements) | migrations |
| Auth | Session guards `web` (users), `admin`, `console` (admins); bcrypt rounds 10; Sanctum installed but unused | `config/auth.php:38-50`, `config/hashing.php:18,32`, `routes/api.php` |
| Key packages | socialite (+facebook/google/linkedin providers), twitteroauth, spatie medialibrary/sitemap/backup, astrotomic translatable, laravelcm/laravel-subscriptions, seotools, purify, maatwebsite/excel, intervention/image, pusher, aws-sdk/flysystem-s3, cloudinary, stripe, paypal, razorpay, mollie, mercadopago, iyzico, paytabs, paystack, cashfree, jazzcash, robokassa, paytr, **ccxt (Binance)** | `composer.json` |
| Fonts | FiraGO (Georgian), BPG font css | `resources/fonts/FiraGO-*.otf`, `resources/css/bpg-font.css` |
| Tests | Only Laravel example tests | `tests/Feature/ExampleTest.php`, `tests/Unit/ExampleTest.php` |

## 3. Structure (counts)
- `app/Livewire` 304 components (Main = public/user, Admin = /dashboard, Installation = installer, Restricted).
- `app/Models` 152 models; `database/migrations` 230 files; 44 seeders; 2 factories.
- `app/Notifications` 79 classes; `app/Mail` 7 mailables.
- `app/Http/Controllers`: 29 payment callback controllers (`Callback/*`), BOG controller, subscription controllers, upload/download controllers, Chatify override controllers, updater.
- `app/Http/Validators` ~140 static validator classes (Riverr pattern).
- `app/Console/Commands` 9 commands; scheduler in `app/Console/Kernel.php:15-24`.
- `lang/en/{messages,dashboard}.php`, `lang/ka/{messages,validation}.php`, `lang/vendor/wireui/*`.
- `routes/web.php` (1001 lines), `routes/admin.php` (1104 lines), `routes/api.php` (1 route), `routes/channels.php`, `routes/console.php`. `routes/install.php` is absent ⇒ app considered installed (`app/Utils/Helper/helpers.php:1608-1650`).

## 4. Entry points / how it runs
- `index.php` at project root (not `public/index.php`) + root `.htaccess` front-controller rewrite ⇒ deployed as cPanel shared hosting with project root = `public_html` (paths in `error_log`: `/home/<user>/public_html/...`). Existing files at root are served directly by Apache (`.htaccess` only rewrites non-existing files) — see risks.
- Livewire update endpoint `/livewire/update` (`routes/web.php:37-44`).
- Cron: `schedule:run` (Kernel) and also public URLs `/tasks/queue`, `/tasks/schedule` (`routes/web.php:47-63`) — likely used as an HTTP cron on shared hosting (Q-042).
- Queue: `database` jobs table exists; `QUEUE_CONNECTION` value unknown.
- Scheduled jobs (`app/Console/Kernel.php:17-23`): `sitemap:generate` every minute; `sellers:unavailable` daily; `expired:bids` daily; `app:upgrade-user-level` twice daily 01:00/13:00; `subscriptions:process-payments` every minute; `refunds:auto-reject` hourly; `backup:run --only-db` monthly. NOT scheduled though present: `orders:complete`, `expired:projects`, `trading:bot`.

## 5. What `regular` and `dist/` are
- `legacy/APP/regular` — a 0-byte file at project root; no references in code. Artifact/junk.
- `legacy/APP/dist/` — compiled front-end build output (`dist/mix-manifest.json`, `dist/public/{css,js}`, `dist/fonts/vendor`). Build artifacts, not source. Root `mix-manifest.json` maps `/js/app.js`, `/css/app.css`.
- Also: `_ide_helper.php` / `_ide_helper_models.php` (IDE stubs; the models file lists only some columns), `sitemap.xml` (generated), `error_log` (PHP log from production, Nov 2023–Jan 2024), `.DS_Store`.

## 6. Authorship styles (≥5 developers)
1. Riverr original: verbose `// Get ...` comments, static `*Validator::validate($this)`, `settings()` helper, string balances (`app/Livewire/Main/Seller/Orders/*`).
2. CR-only line-ending author (classic-Mac editor): ~50 files incl. `CheckoutComponent.php`, `Account/Offers/OffersComponent.php`, `Post/ProjectComponent.php`, `Admin/Services/Payment/Gateways/BogComponent.php`.
3. BOG/subscriptions author: typed services, enums, `data_get`, logging (`app/Services/Bog`, `app/Services/Subscription`, `app/Enums/BillingPeriodEnum.php`, `ProcessSubscriptionPayments.php`).
4. Refunds/escrow author: `DB::transaction` + `lockForUpdate`, enums (`app/Enums/ProjectRefundStatus.php`, `Admin/ProjectRefunds`, `UnblockRequests`).
5. Filament console author (`app/Filament/Resources/*`, 2 duplicate panel providers).
6. Georgian-content author: `GeorgianTextOnly`/`EnglishTextOnly` rules, `ka`-required validators.
Dead/leftover: `app/Http/Controllers/Main/Post/Project/ProjectController.php` + `Account/Projects/EditController.php` (routes commented out, `routes/web.php:783-815`), `resources/views/livewire/admin/subcategories copy/`, legacy conversations Livewire chat, 28 non-Georgian payment gateways, `BinanceTradingBotCommand`.

## 7. Environment variable NAMES (values never recorded)
From `.env.example` and `config/*`: APP_NAME, APP_ENV, APP_KEY, APP_DEBUG, APP_URL, ASSET_URL, LOG_CHANNEL, LOG_DEPRECATIONS_CHANNEL, LOG_LEVEL, LOG_SLACK_WEBHOOK_URL, PAPERTRAIL_URL, PAPERTRAIL_PORT, DB_CONNECTION, DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD, DB_SOCKET, DATABASE_URL, MYSQL_ATTR_SSL_CA, BROADCAST_DRIVER, CACHE_DRIVER, FILESYSTEM_DISK, QUEUE_CONNECTION, SESSION_DRIVER, SESSION_LIFETIME, SESSION_CONNECTION, SESSION_STORE, MEMCACHED_HOST, REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_CLIENT, MAIL_MAILER, MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_ENCRYPTION, MAIL_FROM_ADDRESS, MAIL_FROM_NAME, MAIL_EHLO_DOMAIN, MAILGUN_DOMAIN, MAILGUN_SECRET, MAILGUN_ENDPOINT, POSTMARK_TOKEN, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, AWS_BUCKET, AWS_URL, AWS_ENDPOINT, AWS_USE_PATH_STYLE_ENDPOINT, PUSHER_APP_ID, PUSHER_APP_KEY, PUSHER_APP_SECRET, PUSHER_HOST, PUSHER_PORT, PUSHER_SCHEME, PUSHER_APP_CLUSTER, VITE_PUSHER_*, RECAPTCHA_SECRET_KEY, RECAPTCHA_SITE_KEY, FB_CLIENT_ID, FB_CLIENT_SECRET, FB_REDIRECT, BOG_SUCCESS_URI, BOG_FAIL_URI, BOG_TEST_AMOUNT, CLOUDINARY_NOTIFICATION_URL.
Many gateway/social/SMTP/cloud credentials are stored in the DATABASE (e.g. `automatic_payment_gateways.settings`, settings tables edited in admin), not env.
