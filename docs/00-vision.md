# Vision — MyTask.ge Rebuild
> The Owner fills this in. Every agent reads it. Replace the ⟨…⟩ parts; delete what doesn't apply.

## Why we rebuild
- The current platform works, but was built by 5+ developers; the code is hard to maintain.
- A mobile app is impossible today: website and data are not reachable through a clean API.

## Goals
1. New modern design **based on the current structure** (current UX is user-friendly — keep similar flows and layout, but feel free to modernize and improve it).
2. API-first platform: website + iOS/Android app share one backend, data flows both ways.
3. High performance & speed, clean clean codebase, solid SEO structure, and scalability for new AI features.

## Must NOT break
- Existing users can log in with their current passwords
- Payment/transaction history and balances preserved exactly
- SEO: existing URLs keep working (or redirect properly)
- All existing core functionalities, notifications, and logic from the legacy system must remain intact

## Languages
- All current UI strings are already fully translated 1-to-1 in Georgian and English in the legacy app.
- If Claude/agents add new features or text strings, generate them in English.
- Agents should also generate the corresponding Georgian translation file (or update the existing translation mapping), which I will review and verify manually.

## Users and roles
1. **Admin & Moderators**: 
   - Full admin panel access (managing users, transactions, reports, system settings, visual overrides as built in legacy).
   - **NEW Requirement**: Implement a flexible Role-Based Access Control (RBAC) system for moderators/staff with tailored permissions (e.g., Customer Support, Financial Manager, Content Moderator).
2. **Standard User (Dual-Role System)**:
   - Every registered user automatically possesses two roles: **Freelancer** and **Client (Task Poster)**.
   - Users can toggle between their Freelancer Dashboard (managing GIGs, orders, earnings, messages, portfolio) and Client Dashboard (managing purchased services, posted projects, received deliverables) via a single account/menu switch.
   - **Freelancers** post GIGs (e.g., "I will design a logo") for clients to purchase.
   - **Clients** post Projects (specifying requirements, budget, timeline) to receive proposals from freelancers and hire one.

## Money
- Payment Gateway: Bank of Georgia (BOG) Payment integration.
- Escrow / Hold Rules: Funds are charged upfront when a client purchases a GIG or hires for a project, held in escrow/HOLD status, and released to the freelancer upon completion/approval.
- Disputed or stuck transactions remain on HOLD until resolved via mutual agreement or admin intervention.
- Inspect legacy codebase for exact commission percentage, escrow release logic, and refund routines.

## Integrations in use
- Payment Gateway: Bank of Georgia (BOG) Payment API.
- Email: TWILIO Mail Service.
- SMS Provider: None currently, but architect the system clean so an SMS provider can be integrated easily in the future.
- Analytics: Custom admin dashboard analytics (tracking user registration trends, geographic locations like country/city, device types, browsers, etc.).

## Most-used features (priority order)
1. Post a GIG & Browse GIGs
2. Post a Project & Proposal Submission
3. Escrow / Order fulfillment workflow
4. Dual-Role Dashboard Switcher
5. In-app Chat & Notifications

## What I love about the current design
- The structural layout and UX flow — users easily understand where everything is. (Visual design needs a complete modern overhaul, but UX principles should be kept or improved).

## What annoys me / users complain about
- Multi-language listing creation barrier: Having to manually fill out separate Georgian and English fields when posting a GIG or Project. (Many Georgian users do not speak English well).

## New features I want (later, after parity)
- **AI Auto-Translation for Listings**: Integrated AI that automatically translates posted GIGs and Projects from Georgian to English (and vice versa) 1-to-1.
- **AI Multi-lingual Chat Translation**: Real-time AI chat translation where messages sent in Georgian arrive translated into English for English users, and vice versa, removing language barriers for global market expansion.

## Constraints
- Work locally on my computer first; production deployment only after explicit owner approval.
- Only Claude / Claude Code is used for this project.
- Budget / deadline: Currently running on Claude Pro subscription plan. Keep tasks optimized and resource-efficient.