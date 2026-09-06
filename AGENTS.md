# AGENTS.md — Talabatk Delivery

These instructions are binding for Codex and any coding agent working in this repository.

## Current product decision — supersedes old frontend/phasing decisions
The final product is a **single universal codebase** with:
- **Android:** real installable APK built with React Native + Expo.
- **iPhone/iPad:** Web/PWA from the same Expo project, installable from Safari Home Screen.
- **Admin:** a protected Admin role inside the same product; no separate paid admin application is required.
- **Backend:** Supabase PostgreSQL/Auth/Realtime/Storage/Edge Functions, constrained to the Free plan.
- **No app-store publishing is required.** Android distribution is direct APK; iOS delivery is PWA.

The older Master Requirements remain the historical product-scope reference, but **this file and `docs/TALABATK_FINAL_SPEC_2026.md` supersede its old instruction to build a single-file HTML prototype first and supersede its PWA-only platform choice.** The user has explicitly requested one complete delivery milestone rather than stopping for approval between phases.

## Mission
Build the complete production-capable Talabatk Delivery product from this repository. Internal implementation phases/checklists are encouraged, but **do not stop merely because an internal phase is complete**. Continue through implementation, migrations, tests, security fixes, Android build configuration and PWA build configuration until the repository meets the Definition of Done or a genuinely external credential/account setting blocks a specific verification.

## Source of truth priority
1. `docs/TALABATK_FINAL_SPEC_2026.md` — current binding product/engineering specification.
2. `docs/FREE_ONLY_POLICY.md` — mandatory zero-cost technology/billing policy.
3. This `AGENTS.md` — agent behavior, security and completion rules.
4. `docs/Talabatk_Delivery_Master_Requirements.md` — historical feature-scope source where not contradicted above.
5. Prototype/legacy material is reference only; never copy insecure/mock architecture into production.

## Absolute zero-cost rule
- Do not introduce a service that requires a subscription, credit card, paid API key, paid SMS, per-transaction platform fee, paid map API, or paid add-on for the required product to function.
- Do not silently select a free trial that later charges.
- Do not enable Supabase paid add-ons such as PITR.
- Do not add Paymob/Kashier/Stripe or another real payment gateway in the required implementation.
- Do not add SMS OTP or Firebase Phone Auth.
- Do not add Google Maps Platform APIs.
- Prefer open-source libraries and services with a durable no-cost path.
- If a free hosted quota can be exhausted, implement graceful quota monitoring/degradation and document a local/self-hostable fallback when practical.
- Required operation must remain usable without app-store accounts.

## Required stack
- React Native + Expo + TypeScript.
- Expo Router for universal Android/web navigation and deep links.
- Expo Web export + manifest + Workbox service worker for iPhone/desktop PWA.
- Supabase PostgreSQL/Auth/Realtime/Storage/Edge Functions where needed.
- TanStack Query for server-state caching/retry/invalidation.
- Zod (or equivalent open-source schema validation) for boundary validation.
- MapLibre on Android/web with OpenStreetMap-derived data. Prefer a truly free tile/style source such as OpenFreeMap or another provider whose terms allow the intended usage. Keep the provider configurable; never hard-code a paid provider.
- Expo Notifications / Expo Push service for Android push where configured; Supabase Realtime in-app notifications are mandatory even without push credentials. Web/PWA notifications should be implemented where platform support permits.
- Vitest/Jest-style unit/integration testing as appropriate plus real E2E coverage for web/PWA; add Android device/emulator smoke coverage where practical.
- GitHub Actions CI using only free/public-repository capabilities.

## Product invariants
- User-facing UI is Arabic RTL on every screen. Code/types/docs may be English.
- Mobile-first UX.
- Roles: customer, merchant, driver/courier, admin.
- One authenticated account may hold multiple approved roles and switch without logout.
- Supabase/PostgreSQL is the authoritative source of truth for users, roles, stores, products, orders, totals, statuses, payments, driver availability/capacity and security state.
- Device/local storage may cache non-authoritative UI state, drafts, opaque session/device tokens and cart drafts, but must never grant roles, change authorization, invent successful orders or override server truth.
- Minimum order value remains 0 unless the user explicitly changes it.
- Driver commission currently remains 100% to the driver; the platform takes no delivery commission.
- Payment modes in scope: `cash` and `merchant_paid_online` as a recorded/manual mode only. No gateway integration.
- Coupon discounting at checkout is disabled in the required release unless explicitly re-enabled later.
- No mock/test account details in production UI.

## Security requirements
- Never commit secrets, service-role keys, bot tokens, private credentials, real user data, test auth state or production database dumps.
- Privileged operations must live in trusted Postgres RPC/trigger logic or Supabase Edge Functions.
- Enable RLS on every exposed production table and test negative/cross-tenant access.
- UI role checks are never authorization.
- Auth must use Supabase Auth/session authority. Never store plaintext passwords or password hashes in public app tables.
- Required login UX is phone + password without paid SMS OTP. Configure the auth flow so no paid verification channel is required.
- PIN, when enabled as secondary re-authentication, is verified server-side only. Never return `pin_hash` to clients. Add attempt counting/temporary lockout.
- Trusted-device support must use an opaque generated device token with server-side validation; native secure storage should be used on Android. A client-stored identifier is never itself authorization.
- Admin creation/role elevation cannot be performed by an ordinary client.
- Prevent IDOR/cross-tenant access for every role.
- Contact details are masked until the participant is authorized by the order lifecycle.
- Totals, delivery fees, store ownership and valid order-state transitions are validated server-side.
- Order creation is transactional/race-safe.
- Driver claiming is atomic; competing drivers cannot both win the same order.
- Driver capacity and availability are server-controlled through safe RPCs.
- Merchant can update only orders belonging to owned stores.
- Drivers can update only their own locations and allowed order steps.
- Customers can see/manage only their own private data/orders.
- SECURITY DEFINER RPCs must use explicit safe `search_path`, internal auth/role checks and minimal execute grants.
- Telegram/notification secrets, if used, remain server-side only.
- Maintain immutable/append-oriented audit logs for sensitive admin/security actions.
- Provide privacy controls including account/data-deletion request flow and minimal retention of sensitive location data.

## Required feature coverage
Implement the complete feature catalogue in `docs/TALABATK_FINAL_SPEC_2026.md`, including customer, merchant, driver and admin features; applications/approvals; realtime order lifecycle; GPS; notifications; complaints; ratings; favorites; saved addresses; reorder; scheduling; search; inventory/POS/reporting; maintenance mode; free-tier monitoring; audit/security; accessibility; network failure and PWA behavior.

## Authentication/login UX
The login/signup screens are customer-facing marketing surfaces. Do NOT expose internal phrases such as “one account combines roles”, “no email”, “no SMS”, architecture notes, test credentials or implementation details. Use concise Arabic benefit-oriented copy.

## Maps/location rules
- No Google Maps paid API.
- Map provider/style URL must be configurable through public non-secret configuration.
- Always display required OpenStreetMap/provider attribution.
- Do not implement prohibited bulk tile prefetching against community OSM servers.
- GPS permission must be contextual and revocable.
- Persist only the minimum driver location history needed for active delivery/operations; avoid indefinite high-frequency tracking.
- Handle denied permission, stale coordinates, GPS loss and network loss safely.

## Offline/network rules
- Android should remain navigable through transient network failure and keep safe local drafts where useful.
- PWA service worker should cache static assets carefully; never cache private authenticated API responses in a cross-user-leaking way.
- Do not show an order/action as completed until the authoritative write succeeds.
- Mutations that can be safely retried need idempotency/deduplication protection.
- Show Arabic retry/offline states instead of silent failures.
- Test recovery after reload/reconnect.

## Performance/accessibility
- Lazy-load heavy role routes/screens/maps.
- Compress uploaded store/product images before upload and enforce file limits.
- Paginate/virtualize large admin/order lists.
- Use database indexes for common filters/search/geo bounding queries.
- Support text scaling/zoom, screen-reader labels, logical focus order, sufficient contrast and touch targets.
- Avoid aggressive PWA caching that can strand users on stale versions.

## Testing gate
Completion requires more than a successful build. Run/fix as applicable:
1. TypeScript/typecheck.
2. Lint.
3. Unit tests for critical pure/domain/security helpers.
4. Database migration validation on a clean local/test database where tooling permits.
5. RLS/RPC negative tests for cross-user/cross-role access.
6. Web/PWA E2E covering signup/login/session/role routing/customer/merchant/driver/admin flows.
7. Atomic competing-driver acceptance test.
8. Invalid state-transition and tampered-total tests.
9. Network/offline/retry/idempotency tests.
10. PWA manifest/service-worker/installability/deep-link tests.
11. Android build or prebuild verification and at least a launch/smoke path on emulator/device when environment permits.
12. Accessibility/mobile viewport checks.
13. Production web export.
14. Direct-install Android APK configuration/build path.

Tests must be deterministic. Seed/reset state deliberately. Prefer semantic/accessibility locators. Do not “fix” failing tests by deleting coverage, adding arbitrary sleeps, broad retries, `.skip`, or weakening security assertions.

## One-stage execution rule for Codex
Treat the entire product as **one delivery milestone**. You may implement in an internal sequence (foundation -> database/security -> auth -> roles -> order flow -> features -> offline/PWA -> tests/build), but do not request user approval after each internal stage and do not stop at an audit/report. Fix discovered defects as part of the same assignment until the Definition of Done is reached.

## Definition of Done
The repository is ready only when:
- required feature scope is implemented or a specific external credential/account setting is the only blocker;
- migrations/schema/RLS/RPCs are reproducible;
- no mock business data is used as production truth;
- relevant tests pass;
- lint/typecheck/build pass;
- web export is a working installable PWA;
- Android project can generate a directly installable APK with documented free/local commands;
- no required feature depends on a paid service;
- security/privacy checks are satisfied;
- `.env.example`, setup docs and final status are current.

## Git discipline
- Keep commits focused and descriptive.
- Use migrations; do not rely on manual schema drift.
- Never rewrite unrelated code without reason.
- Never commit generated credentials, APK signing secrets, `.env`, node_modules, build outputs, private dumps or Playwright auth state.

## Handoff rule
Before stopping, leave a concise status in the repository: completed features, files/migrations added, exact commands run, pass/fail results, external configuration still needed, and exact next action. Never fabricate tests, deployments or builds.