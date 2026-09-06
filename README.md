# Talabatk Delivery — طلباتك دليفري

The repository now contains the first real universal implementation, not only planning documents.

## Current architecture
- Android native app: React Native + Expo SDK 57
- iPhone/iPad: Expo Web/PWA from the same codebase
- Admin: protected role inside the same product
- Backend: existing Supabase project (Free plan)
- Web hosting target: new Vercel project for `abdallah5555/Talabatk-delivery`

## Implemented foundation
- Expo Router + TypeScript
- Arabic RTL UI shell
- phone/password login and signup surfaces
- Supabase session persistence using SecureStore on native and browser storage on web
- store discovery and menu loading from live Supabase tables
- cart and cash checkout flow
- secure order creation through `create_order_secure` RPC
- order history
- role-aware account/admin/merchant/driver entry points
- PWA manifest + service worker that deliberately avoids caching Supabase API responses
- direct APK build profile
- CI/typecheck/test/web-export configuration

## Required environment
Copy `.env.example` to your local environment. Public client values use `EXPO_PUBLIC_*`. Never put service-role keys or private credentials in public variables.

## Binding implementation references
1. `docs/TALABATK_FINAL_SPEC_2026.md`
2. `docs/FREE_ONLY_POLICY.md`
3. `AGENTS.md`
4. `CODEX_START_HERE.md`

## Important
This is an active implementation. Production readiness still requires completing remaining merchant/driver/admin feature depth, Supabase hardening, negative RLS/RPC tests, Android build verification and Vercel deployment verification. Do not claim those checks have passed until they have actually run.
