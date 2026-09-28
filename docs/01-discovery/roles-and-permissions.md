# Roles and permissions (legacy)
## Actors
| Actor | How identified | Evidence |
|---|---|---|
| Guest | not logged in | – |
| User – client role | any logged-in user (account_type buyer or seller) | `/account/*` routes `auth` |
| User – freelancer role | `users.account_type === 'seller'` (default for all new users since 2025-06) | `app/Http/Middleware/OnlySeller.php:18`, migration `2025_06_08_213608` |
| Premium subscriber | active subscription (`hasSubscription()`) | `app/Models/User.php:326-334` |
| Restricted user | `users.is_restricted` | `app/Http/Middleware/Restricted.php` |
| Banned user | `users.status='banned'` (login blocked; social login not checked) | `LoginComponent.php` |
| Banned IP | `banned_ips.attempts ≥ 3` (admin login only) | `isIpBanned.php:26` |
| Admin | `admins` table, guard `admin` (/dashboard) and `console` (/console). No roles/permissions; `canAccessPanel` returns true | `config/auth.php:38-50`, `app/Models/Admin.php:38-41` |
| System admin inbox | `Admin::first()` receives every admin email (24 call sites) | e.g. `CheckoutComponent.php` (CR) 5341 |

## Matrix (✓ allowed, ✗ not, P = Premium required, U = UI-only gate)
| Action | Guest | Client | Freelancer (seller) | Premium | Admin |
|---|---|---|---|---|---|
| Browse gigs/projects/profiles/categories | ✓ | ✓ | ✓ | ✓ | ✓ |
| View project bids list | ✗ | owner only | ✗ | P | ✓ |
| See client username on project | masked | masked/own | masked | P | ✓ |
| Post project | ✗ | ✓ (if who_can_post allows) | ✓ (if allows) | ✓ | – |
| Send proposal | ✗ | ✗ (must be seller) | ✓ server-side; U-gated to Premium in view | P (UI) | – |
| Award / revoke bid | ✗ | owner | – | – | ✓ (bid moderation) |
| Accept/reject award | ✗ | – | awarded freelancer | – | – |
| Create gig | ✗ | ✗ | 1 gig max | unlimited | edit/approve |
| Buy gig (cart/checkout) | ✗ (cart ok) | ✓ (not own gig) | ✓ | ✓ | – |
| Start / deliver / cancel order | – | cancel while pending | start, deliver, cancel while pending | – | delete order |
| Complete order / release milestone / release offer | – | ✓ | – | – | offers & milestones |
| Request refund / raise dispute | – | ✓ | – | – | resolve |
| Accept/decline refund | – | – | ✓ | – | ✓ |
| Unblock money request | – | – | ✓ (72h after delivery) | – | approve/decline |
| Send custom offer | – | ✓ to sellers | ✓ | – | approve if required |
| Deposit / withdraw | – | deposit | withdraw (seller routes) | same fee | approve/reject withdrawals, edit balances |
| Chat (/inbox) | ✗ | ✓ | ✓ | ✓ | view conversations |
| Contact project author button | ✗ | – | U → P | P | – |
| Subscribe / points purchase | ✗ | ✓ | ✓ | – | gift/cancel in /console |
| ID verification | ✗ | ✓ submit | ✓ | – | approve/decline |
| Admin panel | ✗ | ✗ | ✗ | ✗ | full, no granularity |

Note: Vision requires new RBAC for staff (Customer Support, Financial Manager, Content Moderator) — no legacy equivalent.
