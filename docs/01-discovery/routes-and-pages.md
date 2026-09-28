# Routes and pages — legacy vs live
Legend: Auth = middleware. All `routes/web.php` routes get the `web` group: EncryptCookies, Session, CSRF, SetLocale, UserLastActivity, UpgradeLevel, XFrameHeaders, SwitchTheme, AuthenticateSession (`legacy/APP/app/Http/Kernel.php:163-176`). The "Main" group adds `restricted` (redirect restricted users to `/restricted`) and `tracker` (analytics) (`routes/web.php:66`). "seller" = `account_type==='seller'` else redirect `/` (`app/Http/Middleware/OnlySeller.php:18`). Language is NOT in the URL: `?locale=ka|en` sets session locale (`SetLocale.php:24-48`); `?theme=dark|light` sets a 7-day cookie (`SwitchTheme.php:22-34`).
Live column: Y = seen/linked on https://mytask.ge (2026-09-28 read-only fetch), ? = not checked, N = broken/absent live.

## Public / user (Livewire unless noted) — `legacy/APP/routes/web.php`
| Route | Component / controller | Auth | Page | Live |
|---|---|---|---|---|
| GET /ka/gita, /en/gita (l.8-13) | closure → views `faq.index`, `faq.index_en` | – | "MyTask App" pitch/landing page | Y |
| GET /te (l.15-18) | closure returns logo src | – | debug leftover | ? |
| GET /success, /fail (l.20-21) | `Main\PaymentBogController@success/@fail` | none | BOG return URLs (orders/offers/milestones/deposit/subscription) | ? |
| GET /update (l.24-34) | `Update\UpdateController@update` | none | self-updater | ? (should not be public) |
| POST /livewire/update (l.37-44) | Livewire | – | Livewire AJAX | Y |
| GET /tasks/queue, /tasks/schedule (l.47-63) | closures run artisan | none | HTTP cron | ? |
| GET / (l.72) | Home\HomeComponent | – | Home | Y |
| GET /subscription (l.77) | Subscription\SubscriptionComponent (name main.subscription) | – | Plans page (Standard free / Premium 9.99 GEL or 100 points) | Y |
| GET /subscription/subscribe/{planSlug} (l.82) | SubscriptionController@subscribe | auth | starts BOG payment (`?period=month|year`) | ? |
| POST /subscription/purchase-with-points (l.999) | Main\SubscriptionController@purchaseWithPoints | auth | buy premium with points | ? |
| GET /post/service (l.91) | Post\ServiceComponent | auth | post-a-service entry | ? |
| GET /post/project (l.94) | Post\ProjectComponent | auth | Post a project | Y (header) |
| GET /explore/projects (l.105) | Explore\Projects\ProjectsComponent | – | Browse projects | Y |
| GET /explore/projects/{category_slug} (l.108) | CategoryComponent | – | projects by category | ? |
| GET /explore/projects/{category_slug}/{skill_slug} (l.111) | SkillComponent | – | projects by skill | ? |
| GET /project/{pid}/{slug} (l.121) | Project\ProjectComponent | – | Project detail + proposal modal | Y |
| GET /blog, /blog/{slug} (l.129-132) | Blog components | – | Blog | N (redirects to home — blog disabled?) |
| GET /sellers (l.140) | Sellers\SellersComponent | – | Top freelancers | Y |
| GET /redirect (l.148) | Redirect\RedirectComponent | – | outbound link redirector | ? |
| GET /newsletter/verify (l.156) | Newsletter\VerifyComponent | – | newsletter double opt-in | ? |
| GET /service/{slug} (l.164) | Service\ServiceComponent (name service) | – | Gig page | Y |
| GET /cart (l.172) | Cart\CartComponent | – | Cart | ? |
| GET /checkout (l.180) | Checkout\CheckoutComponent | auth | Gig checkout | ? |
| GET /checkout/{uid}/{type} (l.188) | Checkout\UnifiedCheckoutComponent | auth | Checkout for `project` / `offer` | ? |
| GET /account/settings (l.199) | Account\Settings | auth | Account settings | ? |
| GET /account/cards (l.206) | Account\Cards | auth | Saved cards (BOG) | ? |
| GET /account/my-subscription (l.211) | Account\Subscription\MySubscription | auth | My subscription / cancel | ? |
| GET /account/password (l.218) | Password | auth | change password | ? |
| GET /account/verification (l.226) | Verification | auth | ID verification | ? |
| GET /account/orders, /account/orders/requirements, /account/orders/files (l.234-243) | Orders components | auth | Buyer orders, requirements form, delivered files (`?orderId=&itemId=`) | ? |
| GET /account/reviews, /create/{itemId}, /edit/{id} (l.253-262) | Reviews | auth | Buyer reviews | ? |
| GET /account/favorite (l.272) | Favorite | auth | Saved gigs | ? |
| GET /account/billing (l.280) | Billing | auth | Billing info | ? |
| GET /account/refunds, /request/{id}, /details/{id} (l.288-297) | Refunds | auth | Gig refunds (buyer) | ? |
| GET /account/deposit, /account/deposit/history (l.307-310) | Deposit | auth | Wallet top-up (BOG) | ? |
| GET /account/projects (name account.projects), /checkout/{id}, /milestones/{id}, /payments/{id}, /payments/{id}/create, /edit/{id}, /files (l.318-338) | Account\Projects\* | auth | Client projects dashboard, promotion checkout, milestones (older UI), payments (newer UI), edit, delivered files | ? |
| GET /account/project-refunds/request/{id}, /details/{id} (l.352-355) | ProjectRefunds | auth | Project refund (client) | ? |
| GET /account/sessions (l.365) | Sessions | auth | Active sessions | ? |
| GET /account/offers (l.373) | Account\Offers | auth | Custom offers sent (client) | ? |
| GET /account/referrals (l.381) | Referrals | auth | Referral code & earnings | ? |
| (none) /account/profile | – | – | linked from `resources/views/components/layouts/partials/header.blade.php` but NOT routed ⇒ 404 | N |
| GET /create (l.391) | Create\CreateComponent | auth | Create gig wizard | ? |
| GET /start_selling (l.399) | Become\SellerComponent | – | Become seller | Y |
| GET /seller/home (name seller.home) (l.410) | Seller\Home | seller | Freelancer dashboard | ? |
| GET /seller/gigs, /analytics/{id}, /edit/{id} (l.418-427) | Seller\Gigs | seller | My gigs | ? |
| GET /seller/reviews, /details/{id} (l.437-443) | Seller\Reviews | seller | Reviews received | ? |
| GET /seller/orders, /details/{id}, /deliver/{id}, /requirements/{id} (l.453-465) | Seller\Orders | seller | Sales | ? |
| GET /seller/portfolio, /create, /edit/{id} (l.475-484) | Seller\Portfolio | seller | Portfolio | ? |
| GET /seller/earnings (l.494) | Seller\Earnings | seller | Earnings | ? |
| GET /seller/withdrawals, /settings, /create (l.502-508) | Seller\Withdrawals | seller | Withdrawals | ? |
| GET /seller/refunds, /details/{id} (l.516-522) | Seller\Refunds | seller | Refunds against me (gig + project) | ? |
| GET /seller/unblock-requests, /create/{uid}/{type} (l.532-535) | Seller\UnblockRequests | seller | Ask admin to release escrow | ? |
| GET /seller/projects, /deliver/{id}, /milestones/{id}, /bids, /bids/checkout/{id}, /bids/edit/{id} (l.543-574) | Seller\Projects\* | seller | Awarded projects, deliver, milestones, my proposals, proposal-upgrade checkout, edit proposal | ? |
| GET /seller/offers (l.586) | Seller\Offers | seller | Custom offers received | ? |
| GET /help/contact (l.599) | Help\Contact | – | Support form | Y |
| GET /categories/{c}, /{c}/{s}, /{c}/{s}/{child} (l.609-615) | Categories\* | – | Gig category pages (3 levels) | Y |
| GET /profile/{username}, /portfolio, /portfolio/{slug} (l.623-629) | Profile\* | – | Public profile / portfolio | Y |
| GET /hire/{keyword} (l.637) | Hire\HireComponent | – | SEO "hire X" page | ? |
| GET /messages, /messages/new/{username}, /messages/{conversationId} (l.645-651) | Messages\* | auth | legacy conversations; `/messages/new/{username}` redirects to `/inbox/{uid}` (`app/Livewire/Main/Messages/NewComponent.php:21-37`) | partially dead |
| GET /search (name main.search) (l.659) | Search\SearchComponent | – | Search listings | Y |
| GET /page/{slug} (l.667) | Page\PageComponent | – | CMS pages (about-company, contact-information, terms-of-service, privacy-policy, payments, mytask-faq, how-platform-works) | Y |
| GET /reviews/{id} (l.675) | Reviews\ReviewsComponent | – | Gig reviews list | ? |
| GET /auth/register, /login (name login), /verify, /request, /password/reset, /password/update (l.688-706) | Auth\* | guest | Auth pages | Y (login/register) |
| GET /auth/{github,linkedin,google,facebook,twitter}[/callback] (l.714-766) | Social\* | guest | Social login (enabled per `settings_auth`) | ? |
| GET /auth/logout (l.776) | Auth\Logout | auth | Logout | – |
| GET /uploads/restrictions/{uid} (l.821-824) | FileController@download | auth:admin | appeal files | – |
| GET /uploads/documents/{uid} (l.829-832) | DocumentController@download | none | gig documents | – |
| GET /uploads/requirements/{orderId}/{itemId}/{reqId}/{fileId} (l.837-840) | RequirementsController | auth | order requirement files | – |
| GET /uploads/delivered/{orderId}/{itemId}/{workId}/{fileId} (l.845-848) | DeliveredController | auth | gig delivered work | – |
| GET /uploads/verifications/{id}/{type}/{fileId} (l.853-856) | VerificationsController | none at route; checks admin/owner in code | ID docs | – |
| GET /uploads/offers/{file}, /offers/work/{file} (l.861-867) | OffersController | auth | offer files | – |
| GET /uploads/project-delivered/{projectId}/{workId}/{fileId} (l.872-875) | ProjectDeliveredController | auth | project work | – |
| /callback/* (l.882-987) | 29 gateway callbacks (asaas, campay, cashfree, cpay, duitku, ecpay, epoint, fastpay, flutterwave, freekassa, genie-business, iyzico, jazzcash, mercadopago, mollie, nowpayments, paymob, paymob-pk, paypal, paystack, paytabs, paytr, razorpay, robokassa, stripe, vnpay, xendit, youcanpay) | none, CSRF-exempt (`VerifyCsrfToken.php:14-17`) | non-BOG gateways — likely dead for Georgia (Q-016). NOTE: no route for BOG's configured `https://mytask.ge/callback` | – |
| GET /restricted (l.990-995) | Restricted\IndexComponent | auth | Restrictions removal center (appeal) | – |
| GET /api/user (`routes/api.php:17-19`) | closure | auth:sanctum | unused | – |
| Chatify package routes (not in repo; configured `config/chatify.php:24-33`) | `/inbox`, `/inbox/{id}` + AJAX endpoints (send, fetch, seen, getContacts, favorite, search, sharedPhotos, deleteConversation, deleteMessage, setActiveStatus, download) → `app/Http/Controllers/Chat/MessagesController.php`; `/inbox/api/*` → `Chat/Api/MessagesController.php` | web+auth / api | ACTIVE chat UI | Y (header) |
| Broadcast auth | channels `App.Models.User.{id}`, `refund.{uid}`, `project-refund.{uid}` (`routes/channels.php:14-34`) | auth | realtime | – |
| /console (Filament) | Resources: Plan, ProjectCategory, Project, ReferralCodeBenefit, Subscription, User (+Referrals relation) (`app/Filament/Resources/*`) | guard `console` (admins) | second admin panel | ? |
| /install/* | only if `routes/install.php` exists — absent | – | installer (dead) | – |

## Admin `/dashboard` (`legacy/APP/routes/admin.php`, middleware `web, auth:admin`; login `web, banned.ip, guest:admin` l.1094-1100)
Home (l.13); profile; logout; invoices (offline/BOG payment approvals); users (list/create/edit/details/message/restrict, transactions, trash); levels (CRUD); withdrawals; gigs (list/edit/analytics/trash); packages; attributes; orders (+details); portfolios; refunds (+details); project-refunds/details/{id}; unblock-requests (+details); projects (list, settings, milestones/{id}, plans, plans/bidding/edit, categories CRUD; skills commented out l.201-209), projects/subscriptions, projects/bids, projects/bids/subscriptions; offers; categories/subcategories/childcategories CRUD+delete; reviews; reports (users, gigs, projects, bids); conversations (+/{from_id}/{to_id}), chat/download/{fileName}; advertisements; support (+reply/{id}); newsletter (+settings, send/{id}); languages (+create/edit/translate/{id}); pages; countries; services/payment (+29 gateway edit pages; `edit/bog` is wired to **IyzicoComponent**, l.632, although `BogComponent` exists), services/cloud (amazon, wasabi, cloudinary), recaptcha, findip; settings (general, currency, auth, commission, footer, media, publish, security, seo, smtp, withdrawal, appearance, hero, chat); verifications; blog (articles, settings, comments); system (crontab, cache, maintenance, reset, licensing).

## Live-only / live notes
- Live links observed: home, 7 gig categories + ~250 sub/child category URLs, `/subscription`, `/search`, `/explore/projects`, `/help/contact`, `/auth/login`, `/auth/register`, `/start_selling`, `/?locale=ka`, `/?theme=dark`, `/service/{slug}`, `/project/{pid}/{slug}`, `/profile/{username}`, `/sellers`, `/page/{slug}` (7 pages), `/ka/gita`, `/en/gita`, `/inbox` (auth). All exist in code.
- `/sitemap.xml` → HTTP 404 live, while `sitemap:generate` writes `base_path('sitemap.xml')` every minute (`app/Console/Commands/GenerateSitemap.php:36-60`, `Kernel.php:17`) (Q-025).
- `/blog` → renders home (blog disabled) (Q-025).
- Gig URL pattern `/service/{georgian-transliterated-slug}-{UID20}` (`app/Livewire/Main/Create/CreateComponent.php` slug = `Str::slug(title.ka)` + '-' + uid). Project URL `/project/{6-digit pid}/{slug}`. These must be preserved for SEO.
