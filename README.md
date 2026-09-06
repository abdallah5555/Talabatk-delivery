# Talabatk Delivery — طلباتك دليفري

Production workspace for **طلباتك دليفري** using one universal codebase:

- **Android:** real native app distributed directly as APK.
- **iPhone/iPad:** installable PWA exported from the same Expo project.
- **Admin:** secure role inside the same product.
- **Backend:** Supabase Free plan only.
- **Business rule:** the required product must not depend on a paid service.

## Codex — read first
Before writing implementation code, read in this exact order:

1. [`docs/TALABATK_FINAL_SPEC_2026.md`](./docs/TALABATK_FINAL_SPEC_2026.md) — current binding product + engineering specification.
2. [`docs/FREE_ONLY_POLICY.md`](./docs/FREE_ONLY_POLICY.md) — mandatory zero-cost/billing guardrails.
3. [`AGENTS.md`](./AGENTS.md) — binding agent/security/testing rules.
4. [`CODEX_START_HERE.md`](./CODEX_START_HERE.md) — one-stage execution brief.
5. [`docs/Talabatk_Delivery_Master_Requirements.md`](./docs/Talabatk_Delivery_Master_Requirements.md) — historical feature-scope reference only where it does not conflict with the final spec.

## Final target stack
- React Native + Expo + TypeScript
- Expo Router
- Expo Web/PWA + Workbox
- Supabase PostgreSQL/Auth/RLS/Realtime/Storage/Edge Functions — Free plan only
- TanStack Query
- MapLibre + OpenStreetMap-derived map data
- configurable zero-cost map style/source
- Expo Notifications / in-app Realtime notifications
- automated unit/integration/security/E2E tests
- GitHub Actions within free limits

## Core product rules
- Production UI is Arabic + RTL.
- Mobile-first.
- Roles: customer, merchant, driver/courier, admin.
- One account may hold multiple approved roles.
- Supabase/database is the authoritative source of truth.
- Never trust client storage for authorization, totals, role assignment, driver capacity or order success.
- Server-side RLS/RPC/security boundaries are mandatory and negatively tested.
- Minimum order remains 0.
- Driver keeps 100% of delivery fee; platform commission is 0.
- Current payment scope is cash + manually recorded merchant-paid-online state only.
- Checkout coupons are disabled unless explicitly re-enabled later.
- No app-store publishing is required.

## Paid services explicitly excluded
The required build must not introduce:
- Google Maps Platform
- SMS OTP / Firebase Phone Auth
- WhatsApp paid OTP
- Paymob/Kashier/Stripe payment gateway
- Supabase PITR / paid backup add-ons
- paid routing/geocoding
- mandatory paid analytics/error monitoring
- Google Play/App Store dependency

See [`docs/FREE_ONLY_POLICY.md`](./docs/FREE_ONLY_POLICY.md) for replacements and guardrails.

## Environment
Copy `.env.example` to a local untracked env file.

Public client variables use Expo naming:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_MAP_STYLE_URL=
EXPO_PUBLIC_WEB_BASE_URL=
```

Never put service-role keys, bot tokens, FCM private credentials, signing secrets or admin secrets in `EXPO_PUBLIC_*` variables.

## Current repository purpose
This repository is intentionally prepared as a clean Codex implementation workspace. Historical prototype and old web-only architecture are references for product intent, not instructions to recreate the old SPA.

The current decision is to implement **Android native + iPhone PWA from one Expo codebase** and complete the entire product as one delivery milestone.

## Completion standard
Codex must not stop at scaffolding, audit, database setup or a passing build. Completion requires the full product feature set, secure schema/RLS/RPCs, critical role flows, network/offline resilience, PWA build, direct APK build path, deterministic tests, security negative coverage and updated setup documentation.

See `AGENTS.md` and `CODEX_START_HERE.md` for the complete Definition of Done.