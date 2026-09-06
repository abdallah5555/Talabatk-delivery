# Codex — Start Here

Read these files completely, in this order, before implementation:

1. `docs/TALABATK_FINAL_SPEC_2026.md`
2. `docs/FREE_ONLY_POLICY.md`
3. `docs/CODEX_ENVIRONMENT.md`
4. `AGENTS.md`
5. `docs/Talabatk_Delivery_Master_Requirements.md` for historical feature context only where it does not conflict with the current final spec.

## Your assignment
Build the **complete Talabatk Delivery product** in this repository as one delivery milestone.

Do not stop after planning, scaffolding, database setup, a partial role, an audit, a successful build or an internal phase. You may use an internal implementation sequence, but continue through all required features, migrations, security, tests, Android build configuration and PWA configuration until the Definition of Done is reached or a genuinely external credential/account setting is the only remaining blocker.

## Infrastructure access first
Before implementation, connect the MCP servers declared in `.mcp.json`:
- Supabase MCP is already scoped to project `vriwhtuxagnbfxybjviz`.
- Vercel MCP targets the user's Vercel account via OAuth.

Trigger OAuth authorization if the MCP client requests it. Do not ask the user for service-role keys, database passwords or Vercel personal access tokens when OAuth/provider tools can perform the task.

Read `docs/CODEX_ENVIRONMENT.md` so you do not modify the legacy Vercel/GitHub project by mistake.

## Final architecture you must implement
- One universal **React Native + Expo + TypeScript** codebase.
- **Android:** native app distributed directly as APK; no Play Store required.
- **iPhone/iPad:** same project exported as installable Web/PWA.
- **Admin:** protected role inside the same app/product.
- **Backend:** existing scoped Supabase project on the Free plan, audited and hardened before production use.
- **Web hosting:** create/link a NEW Vercel project for `abdallah5555/Talabatk-delivery`; do not overwrite the legacy `Talbak-delivery` Vercel project.
- **Navigation/deep links:** Expo Router.
- **Server state:** TanStack Query.
- **Maps:** MapLibre + OpenStreetMap-derived data, with a truly free/configurable tile/style source.
- **Notifications:** Supabase Realtime/in-app mandatory; zero-cost Android push path where configuration permits.

## Absolute cost rule
The required product must not depend on paid infrastructure.

Do not add as required dependencies:
- Google Maps Platform
- SMS OTP / Firebase Phone Auth
- WhatsApp paid OTP
- Paymob/Kashier/Stripe or another payment gateway
- Supabase PITR or paid backup add-ons
- paid Sentry/analytics
- app-store publishing
- paid routing/geocoding

If an old document suggests something that is now paid, replace it with the free alternative defined in `docs/FREE_ONLY_POLICY.md` while preserving the intended product feature.

## Required implementation scope
You are responsible for the full catalogue in `docs/TALABATK_FINAL_SPEC_2026.md`, including:

### Foundation
- Expo project structure
- Arabic RTL theme/system
- Expo Router routes/deep links
- Supabase typed client/data layer
- migrations/schema/RLS/RPCs
- env/setup docs

### Auth/security
- phone + password
- session restore/logout
- multi-role authorization and role switcher
- server-side PIN/trusted-device security where specified
- admin privilege isolation
- RLS negative tests
- server-authoritative totals/state transitions
- atomic driver acceptance/capacity
- audit logs
- privacy/contact masking

### Customer
- discovery/search/filter
- store/menu
- favorites
- saved addresses/map selection
- safe cart/multi-store handling
- checkout
- realtime tracking
- history/reorder
- scheduled orders
- ratings/reviews
- notifications
- complaints
- account/privacy flows

### Merchant
- application/approval
- store/hours
- menu/product/inventory management
- incoming order lifecycle
- realtime alerts
- POS/manual sales
- revenue/reports/CSV

### Driver
- application/approval
- persisted availability
- GPS/current location
- nearby eligible orders
- atomic claim
- capacity/batching
- delivery lifecycle
- earnings
- issue reporting

### Admin
- users/roles/applications
- stores/orders
- complaints
- settings/service areas
- maintenance mode
- audit log
- suspicious-activity indicators
- free-tier/health indicators
- SQL/application analytics

### Platform quality
- PWA manifest/icons/service worker
- iPhone installability/deep links
- Android native permissions/build path
- direct APK configuration
- offline/network failure/retry/idempotency
- accessibility
- performance/lazy loading/pagination/image compression
- deterministic tests and CI

## Required working method
1. Inspect repository and final specifications.
2. Authenticate MCP provider connections when requested.
3. Audit the existing Supabase schema/RLS/RPCs before changing them; preserve useful compatible work and fix unsafe/outdated pieces through new migrations.
4. Create a concise internal checklist, then implement it without waiting for user approval between items.
5. Prefer secure database constraints/RPCs over client trust.
6. For each defect discovered while testing, fix the product and add/adjust regression coverage.
7. Never weaken a test/security rule just to make CI green.
8. Keep `.env.example` and setup documentation current.
9. Commit no secrets or real production data.
10. When the PWA build is ready, create/link the NEW Vercel project and deploy it; inspect logs and fix deployment failures.

## Completion gate
Before claiming completion, run every applicable check:
- dependency install
- typecheck
- lint
- unit/integration tests
- migration/database validation
- Supabase security/performance advisors and remediation
- RLS/RPC negative tests
- production web/PWA export
- E2E for customer/merchant/driver/admin
- competing-driver atomic acceptance
- network failure/retry/no-duplicate-order scenarios
- service-worker/manifest/deep-link tests
- Android prebuild/build/launch smoke path where environment permits
- NEW Vercel deployment verification and logs

Fix failures. Do not leave known critical/high security defects as TODOs.

## External blockers
If a provider OAuth consent screen, Expo/FCM configuration, signing credential or another account-level approval cannot be completed by the agent itself:
- finish everything else that can be implemented/tested;
- provide the exact one-time action needed;
- keep mocks out of production paths;
- continue after authorization rather than redesigning around the blocker.

## Final handoff
Leave a final repository status containing:
- implemented feature checklist
- migrations/RPC/RLS summary
- commands actually run
- tests actually passed/failed
- Supabase advisor status
- Android APK build command/path/configuration
- PWA build/deploy command and final Vercel URL
- exact external configuration still required
- confirmation that no required paid service was introduced

Do not fabricate completion or test results.