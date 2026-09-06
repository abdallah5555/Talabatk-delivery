# Talabatk Delivery — Zero-Cost / Free-Only Technology Policy

**Verified policy baseline:** 2026-09-06

This file is binding. The required Talabatk Delivery product must operate without a required paid subscription or paid API. Free quotas can have limits; when a quota is reached the product must degrade gracefully rather than silently switching to billing.

## 1. General rule
Before adding any external service, library or API, Codex must answer:
1. Is the library open-source/free to use?
2. Does the hosted service require a card or paid subscription for the required feature?
3. Can normal required use unexpectedly create an invoice?
4. Is there a free/local fallback?

If the answer creates a billing risk, do not make that service a required dependency.

## 2. Approved core services

### Expo / React Native
Approved for the universal frontend.
- Expo SDK/CLI is open-source/free.
- Cloud EAS services are optional.
- The repository must document a local Android build path so cloud build quotas never force payment.
- Direct APK installation is the required Android distribution method.

### Supabase Free
Approved as backend, within Free-plan quotas.
Use:
- PostgreSQL
- Auth
- Realtime
- Storage
- Edge Functions

Design conservatively around current Free-plan limits and expose app-side usage/health indicators where possible.

Never enable paid Supabase add-ons for required operation.

Explicitly forbidden:
- Point-in-Time Recovery (PITR)
- paid compute upgrades
- paid custom domain requirement
- paid advanced MFA requirement

If Supabase's free quota is exceeded, surface a clear admin warning/maintenance mode rather than adding paid capacity automatically.

### GitHub
Approved for source and CI. Keep workflows within free/public-repository capabilities and avoid unnecessary high-frequency jobs.

## 3. Maps

### Rendering
Approved:
- MapLibre ecosystem / open-source mapping libraries

### Map data
Approved concept:
- OpenStreetMap-derived data with visible attribution

Preferred zero-cost hosted source at this baseline:
- OpenFreeMap public instance, while its published free/no-key/no-registration policy remains applicable

Important:
- Map provider/style URL must be configuration-driven so it can be changed without rewriting business code.
- Standard OpenStreetMap community tile servers are not an unlimited production CDN. Follow their tile usage policy, caching and identification requirements.
- Never bulk-download/prefetch community OSM tiles for offline maps.
- Do not use Google Maps Platform APIs.

## 4. Routing/geocoding/distance
Required product operation must not depend on a paid routing/geocoding API.

For core delivery-fee and nearby-order behavior, prefer:
- GPS coordinates
- PostgreSQL/PostGIS where available in Supabase
- geodesic/Haversine distance for simple estimation
- configurable distance/fee formula

A richer routing engine may be added only if it remains free and operationally practical. It must never block checkout/delivery because a paid third-party route API is unavailable.

## 5. Notifications

### In-app
Mandatory and free-path:
- Supabase notifications table + Realtime subscriptions

### Android push
Approved optional enhancement:
- Expo Notifications / Expo Push service
- FCM may be used only for push transport/configuration where needed; Cloud Messaging itself is a no-cost product.

Do not use Firebase Phone Auth.

### iPhone PWA
Implement standards-based PWA notifications where supported by installed web apps/browser platform, but core order operation must not depend on push permission or delivery.

## 6. Authentication
Required:
- phone + password
- Supabase Auth/session authority
- server-side roles/RLS
- server-side PIN re-auth where implemented

Forbidden as required dependencies:
- SMS OTP
- Firebase Phone Auth
- paid WhatsApp OTP/messaging verification
- paid MFA

If phone ownership verification is ever required later, it must be a new explicit product decision with a separately approved no-cost mechanism.

## 7. Payments
Required modes:
- cash
- manual/recorded `merchant_paid_online` mode where the merchant has already handled payment outside this platform

Forbidden in the required release:
- Stripe
- Paymob
- Kashier
- any gateway that charges transaction fees or requires commercial onboarding

Talabatk itself must not require paid transaction processing.

## 8. Backups
Do not enable Supabase PITR or paid automatic backups.

Free-first backup plan:
- documented local database export/`pg_dump` process when supported
- CSV/JSON export of non-secret business data from admin tools
- optional secure scheduled export only when it can run inside existing free quotas

Never commit backup files containing real user data or secrets to a public repository.

## 9. Error monitoring and analytics
Do not require a paid SaaS.

Use first-party/free mechanisms:
- Error Boundary + structured redacted logs
- application-owned error/event table with sampling and retention limits where useful
- GitHub Actions failures
- Supabase logs available on the current free plan
- SQL aggregate dashboards for orders/users/conversion/operations

A third-party free analytics/error tool may be optional, but the product must remain fully operational without it.

## 10. Images/storage
Use Supabase Storage Free quota conservatively.
- compress images before upload
- enforce dimensions/type/size
- use lazy loading/caching
- clean orphaned assets safely
- do not depend on paid image transformation features

## 11. Hosting PWA
The Expo web export may be hosted on a free static-hosting path that does not require payment. Keep deployment provider-agnostic where practical.

Do not make a custom paid domain mandatory. A provider subdomain is acceptable.

## 12. App distribution
Android:
- direct APK
- local/free build path mandatory
- no Play Store

Apple:
- PWA installed from Safari Home Screen
- no App Store/TestFlight requirement

## 13. Quota failure policy
For any free service with quotas:
- monitor what the app can accurately measure
- warn admin before known thresholds where possible
- throttle abusive/redundant activity
- reduce GPS/realtime frequency when safe
- compress/limit uploads
- implement maintenance/read-only behavior for severe backend constraints
- never silently upgrade a plan or add billing

## 14. Agent rule
If Codex discovers that a library/service named elsewhere in the repository is no longer free, it must:
1. not enable billing;
2. replace it with a free/open option where possible;
3. preserve the intended feature;
4. document the replacement and any unavoidable limitation.

The requirement is **feature completeness within a zero-cost architecture**, not loyalty to an outdated vendor suggestion.