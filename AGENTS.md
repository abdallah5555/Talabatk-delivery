# AGENTS.md — Talabatk Delivery

This repository is the working repository for **Talabatk Delivery (طلباتك دليفري)**. These instructions are binding for Codex and any coding agent working in this repository.

## Mission
Build, test, harden and deploy a production-ready Arabic RTL hyperlocal delivery PWA connecting customers, merchants, couriers and admins. Do not reduce scope silently. Continue through implementation, fixes and tests until the requested milestone is actually complete.

## Source of truth
1. `docs/Talabatk_Delivery_Master_Requirements.md` is the product specification and scope reference.
2. `prototype/index.html` is a Phase-1 UX/workflow reference only. It contains mock/in-memory data and MUST NOT be treated as production architecture.
3. This `AGENTS.md` defines engineering/security/testing rules.
4. If implementation and requirements conflict, preserve security and data integrity and document the conflict.

## Product invariants
- User-facing UI is Arabic and RTL on every screen.
- Mobile-first responsive UX; desktop remains supported.
- Roles: customer, merchant, courier/driver, admin.
- One authenticated user may have multiple roles and switch roles without logging out.
- Production source of truth is Supabase/PostgreSQL, never browser localStorage/mock data for authoritative business state.
- Hosting target: Vercel. PWA must be installable.
- Prefer free-tier services and open-source libraries.
- Maps: OpenStreetMap + Leaflet. Do not add a paid Google Maps API dependency.
- No SMS OTP requirement at this stage.
- Do not enforce a minimum order above 0 unless explicitly requested.
- Payment modes currently supported: cash and merchant-paid-online representation; do not invent a payment gateway.
- Coupon discounts at checkout are disabled unless explicitly re-enabled.

## Required stack
- React + Vite + TypeScript.
- Supabase: PostgreSQL, Auth, Realtime where appropriate, RLS.
- Playwright for real E2E tests.
- PWA manifest + service worker.
- Vercel deployment.
- OSM/Leaflet for maps/location UI.

## Security requirements
- Never commit secrets, tokens, service-role keys, private credentials or real user data.
- Frontend may use only public/anon configuration intended for browsers.
- Privileged operations belong in trusted backend/Edge/Server functions.
- Enable and test RLS for production tables. UI role checks are not authorization.
- Supabase Auth is authoritative for authentication. Never store plaintext passwords or password hashes in app tables.
- PINs, if used, must be securely hashed/verified server-side and must never be stored in plaintext.
- Do not trust localStorage for roles, authorization, balances, orders, availability or sensitive state.
- Prevent IDOR/cross-tenant access: merchants cannot access another merchant's private data; drivers cannot access unauthorized orders; customers cannot access another customer's private orders; admin access must be explicitly authorized.
- Reveal private contact information only at the allowed order stage and to authorized participants.
- Validate order totals and state transitions server-side/database-side; never trust client-calculated totals for authoritative writes.
- Driver acceptance must be atomic and race-safe.
- Admin account creation/privilege elevation must not be possible from an untrusted client.
- Telegram or other secret-backed integrations must run server-side.
- Backups/exports must exclude secrets and credential material.
- Maintain audit logs for sensitive admin/security actions.

## Core data/domain expectations
Design migrations/types/services around, at minimum, users/profiles, user_roles, stores, menu/products, orders, order_items, driver/courier state, applications, ratings/reviews, notifications, complaints and audit logs. Add trusted-device/PIN/security tables only when required by the active implementation. RLS and constraints must accompany schema changes.

## Order flow
Customer browses stores -> cart -> address/checkout -> order creation -> merchant accepts/prepares -> ready -> eligible driver accepts atomically -> on the way -> delivered -> rating/history. Multi-store carts must preserve correct per-store order ownership and totals. Invalid transitions must be rejected, not merely hidden in the UI.

## Role requirements
### Customer
Browse/filter stores and products, favorites, saved addresses, cart, checkout, order history/tracking, notes, ratings and useful notifications. Handle closed/unavailable stores, stock changes and network failure safely.

### Merchant
Own-store isolation, product/menu CRUD, availability/stock, incoming order accept/reject/preparation flow, POS where in scope, sales/reporting and merchant application flow.

### Driver/Courier
Application/approval flow, persisted availability, nearby/eligible orders, atomic acceptance, capacity/batching rules, delivery lifecycle, earnings, location/GPS and safe failure/retry behavior.

### Admin
Secure RBAC, users/applications/orders/complaints/audit visibility, platform settings and maintenance controls. Never expose privileged controls based only on client state.

## Authentication UX
The login/signup page is a customer-facing marketing surface. Do NOT display internal architecture statements such as “one account combines roles”, “without email”, “without SMS”, implementation details, test credentials or security design. Use concise Arabic benefit-oriented copy. Registration must be a real reachable flow and tested.

## PWA/offline/network behavior
- Service-worker tests must be browser-safe and deterministic.
- Do not cache authenticated/private API responses in a way that can leak data between users.
- Provide safe offline/network-error states and retry behavior.
- Never report an order/action as successful until the authoritative write succeeded.
- Test reload/persistence boundaries and stale state.

## Testing gate
Do not claim completion merely because build succeeds. Before a production-ready milestone, run and fix:
1. TypeScript/typecheck.
2. Lint.
3. Unit/integration tests where present.
4. Production build.
5. Playwright E2E against realistic app state.
6. Security/RLS checks for cross-role and cross-tenant access.
7. Network-failure and retry scenarios.
8. PWA/service-worker/installability checks.
9. Mobile viewport and basic accessibility checks.

Critical E2E coverage must include: signup/login/logout/session restore; role routing; customer browse/cart/checkout/order tracking; merchant order lifecycle; driver availability/acceptance/delivery; atomic competing-driver acceptance; unauthorized/cross-account access; invalid state transitions; network failure; reload persistence; PWA/service worker behavior; and production-safe login/signup copy.

Use resilient accessible Playwright locators (`getByRole`, labels, stable test ids where needed). Avoid brittle CSS/text assumptions when a semantic locator is available. Keep tests isolated and seed/reset state deterministically.

## Definition of done
A task is done only when the implementation is complete, relevant tests pass, build/lint/type checks pass, no known critical security regression remains, and documentation/env examples are updated. If a dependency or external credential blocks verification, state exactly what is blocked and leave the repository in a reproducible state.

## Git discipline
- Keep commits focused and descriptive.
- Never commit `.env*` secrets, Playwright auth state, generated credentials, node_modules, build output or private dumps.
- Do not rewrite unrelated working code without reason.
- Prefer migrations over manual database drift.
- Preserve backwards-compatible data migrations where practical.

## Handoff rule
Before stopping, leave a concise status in repository documentation or the task/PR: what changed, commands run, pass/fail results, remaining blockers and exact next action. Never fabricate test/deployment results.