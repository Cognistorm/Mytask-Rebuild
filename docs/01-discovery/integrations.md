# Integrations
| Integration | Purpose | Status | Config / env NAMES | Evidence |
|---|---|---|---|---|
| Bank of Georgia (BOG) iPay e-commerce API | Card payments for gig orders, project milestones, custom offers, wallet top-up, subscriptions; saved-card recurring (`/orders/{id}/subscriptions`, `/ecommerce/orders/{parent}/subscribe`); receipt lookup | ACTIVE (primary) | `config/bog.php` (endpoints hard-coded; BOG_SUCCESS_URI, BOG_FAIL_URI, BOG_TEST_AMOUNT); OAuth client id/secret HARD-CODED [SECRET: BOG_CLIENT_ID/BOG_CLIENT_SECRET] | `app/Services/Bog/BogPayment.php:10-144`; callback_url `https://mytask.ge/callback` (no route) |
| Wallet (internal balance) | pay with balance_available | ACTIVE | – | features.md |
| Offline / bank transfer | manual invoice approval | code present; production state unknown | `offline_payment_gateways` table | `CheckoutComponent.php` (CR) 5380+ |
| 28 other gateways (PayPal, Stripe, Paystack, Razorpay, Mollie, Xendit, …) | Riverr defaults | Probably inactive (Q-016) | DB `automatic_payment_gateways.settings` JSON | `routes/web.php:882-987` |
| Email | all notifications | ACTIVE; provider unknown (vision says Twilio/SendGrid; code supports smtp, mailgun, postmark) | MAIL_MAILER, MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_ENCRYPTION, MAIL_FROM_ADDRESS, MAIL_FROM_NAME, MAILGUN_*, POSTMARK_TOKEN; SMTP also editable in admin (`Admin/Settings/SmtpComponent.php`) | `config/mail.php`, `config/services.php` |
| SMS | none | – | – | – |
| Pusher | Chatify realtime chat + Laravel Echo broadcasts (refund threads) | ACTIVE | PUSHER_APP_ID/KEY/SECRET/HOST/PORT/SCHEME/CLUSTER, VITE_PUSHER_*; ALSO hard-coded key/secret in `config/chatify.php:41-42` [SECRET: PUSHER_APP_SECRET] | `config/chatify.php`, `routes/channels.php` |
| Social login | Google, Facebook, GitHub, LinkedIn, Twitter (toggles in settings_auth; client ids/secrets saved via admin) | unknown which enabled (Q-032) | FB_CLIENT_ID, FB_CLIENT_SECRET, FB_REDIRECT (+ DB) | `app/Livewire/Main/Auth/Social/*` |
| Google reCAPTCHA | register/login/contact | toggle `settings_security.is_recaptcha` | RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY | `app/Rules/Recaptcha.php` |
| Storage | local `public/storage`, custom disk; optional AWS S3 / Wasabi / Cloudinary (`settings_media.default_storage_driver`); CSP comment references an S3 bucket `mytask-media` | unknown which active | AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, AWS_BUCKET, AWS_URL, AWS_ENDPOINT, CLOUDINARY_* | `config/filesystems.php:43-85`, `app/Http/Middleware/XFrameHeaders.php:23` |
| findip.net | IP geolocation for analytics | ACTIVE | key HARD-CODED `config/findip.php:9` [SECRET: FINDIP_KEY] | `app/Jobs/TrackingService.php:101-108` |
| ip-api.com (HTTP) | gig visit geo | ACTIVE | none | `app/Jobs/Main/Service/Track.php:268` |
| Device/UA parsing | jenssegers/agent, matomo device-detector, snowplow referer-parser | ACTIVE | – | TrackingService |
| Binance (ccxt) | automated crypto trading bot — unrelated to marketplace | command present (`trading:bot`), not scheduled | API key/secret HARD-CODED [SECRET: BINANCE_API_KEY/SECRET] | `app/Console/Commands/BinanceTradingBotCommand.php:13-14` |
| Spatie backup | monthly DB backup | scheduled | – | `Kernel.php:23` |
| Spatie sitemap | sitemap.xml | scheduled each minute | – | `GenerateSitemap.php` |
| SEO | artesaos/seotools OpenGraph/Twitter/JSON-LD | ACTIVE | – | every component render() |
| Analytics custom | tracker_* tables, admin home charts | ACTIVE | – | `Admin/Home/HomeComponent.php:96-141` |
| Envato licensing | Riverr license check page | admin System/Licensing | – | `config/envato.php` |
