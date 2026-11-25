---
# Talabatk Delivery: Project State
Source of truth for continuing work. Read first in any new session, then verify main's SHA.
Last updated: 2026-11-25.

## Identity
- Repo: abdallah5555/Talabatk-delivery. Never touch Talbak-delivery.
- Stack: Expo SDK 57, React Native 0.86.3, TypeScript, Expo Router, Supabase, TanStack Query, MapLibre/OSM. Arabic/RTL.
- Slug: talabatk-delicery. Package: com.talabatk.delivery. Expo project id: 1a617642-b1c4-4a68-8fa5-98c0ad3c7911.
- App version 0.1.9, versionCode 15, runtimePolicy appVersion.
- Supabase ref: vriwhtuxagnbfxybjviz (eu-north-1). Never put service role keys in client code.
- Platforms: Android APK via EAS, and PWA on Vercel, from one codebase.
- Owner constraints: no paid services, no paid maps, no SMS OTP, no payment gateway for now. Keep existing features intact.

## Current state
- Expo SDK 57 fix merged via PR #3 (squash): d4ae9916c6695bec3c954ea074f861181e87991a.
- Lockfile sync by refresh-lock bot: 843d5fa46e607dba1f8c7d7dbccce0dcc137cf1f (main head).
- CI #496 on d4ae991 reported success.
- Web publish and Vercel production deploy: success.
- android-apk run #379: status unverified.

## OPEN CRITICAL RISK
- Production OTA auto-published after CI. Update group 3a8b3427-eb2e-477f-ab4e-192eae10359b, Android update id 01a2109b-a70c-791d-acd2-42575182c92a.
- It includes native package changes, but installed APKs are runtime 0.1.9. Risk of crashes.
- Required: rollback production channel to previous update. Status: UNKNOWN until confirmed.
- ota-production.yml runs `cp .env.example .env` (APP_ENV=development, ADS_TEST_MODE=true). Verify EAS production env overrides.

## Workflows
- ci.yml: doctor, lint, typecheck, unit tests, backend auth smoke, web export, Playwright e2e.
- ota-production.yml: auto Android OTA to production after CI success on main.
- android-apk.yml: Release APK after CI success.
- publish-web-assets.yml, deploy-web-vercel.yml, refresh-lock.yml.

## Known issues
- npm audit: 23 vulnerabilities (3 critical, 8 high, 12 moderate). Separate task.
- Lint warning in app/order/[id].tsx (non-blocking).
- PROJECT_HANDOFF_AR.md is outdated (mentions 0.1.8 / build 14).

## Product scope
- Local marketplace, Al-Marj Al-Gedida, Abu Zaabal. Start with a few categories (restaurants, pharmacies, bakeries...). Roles: customer, merchant, driver, admin.
- Pricing server-side, configurable: ~10 EGP/km from first km, min 10 EGP, small time component, road factor 1.10, rounded to whole pounds. Price snapshot saved on order.
- Driver earnings independent of customer rewards.

## Planned additions (PAUSED until rollback and APK verified)
A. Sentry (native: APK). B. PostHog with opt-in consent (AdMob present). C. Expo push with push_tokens + send-push Edge Function (native: APK; iOS PWA not covered). D. Upstash rate limiting, fail open. E. Scheduled encrypted Supabase backups via GitHub Actions. F. WhatsApp support button (JS only). G. Cloudflare docs only.

## Rules
1. Branch from main, PR, wait for green CI, then merge.
2. Additive only. No renaming slugs, packages, or routes. No reducing tests.
3. Native changes need a new APK and a real-device smoke test.
4. JS-only changes ship via OTA only after main's CI is green.
5. DB changes via migrations in supabase/migrations with RLS.
6. Never print secrets, tokens, or EAS variable values.

## Next actions
1. Confirm production OTA rollback.
2. Verify EAS production env variables (names only).
3. Check APK run #379 and record artifact or failure.
4. Owner decision: bump to 0.1.10 / versionCode 16 with new APK (needs approval).
5. Install APK on a real Android device and smoke test (install over old, open, login/register, navigation, orders, maps, notifications).
6. Only after 1–5, resume A–G one at a time.

## Session log
- 2026-11-25: Expo SDK 57 fix merged; production OTA auto-published (rollback flagged urgent); this file created.
---