# Master Requirements & Build Instructions
## Project: Talabatk Delivery (طلباتك دليفري)

**Document type:** Binding project specification for the application and coding agents.
**Version:** 2.0+ production handoff baseline.

> The application UI and all user-facing content must be Arabic with RTL layout. English is used in engineering documentation only.

## 1. Product overview
Talabatk Delivery is a hyperlocal Progressive Web App connecting customers, merchants, couriers/drivers and administrators in the same local service area. The project should remain compatible with free tiers wherever practical.

Production target:
- Frontend: React + Vite + TypeScript.
- Backend/database/auth: Supabase (PostgreSQL, Auth, Realtime where appropriate).
- Hosting: Vercel.
- PWA: manifest + service worker.
- Maps/location: OpenStreetMap + Leaflet; no paid Google Maps API requirement.
- Testing: Playwright E2E plus appropriate unit/integration tests.

## 2. Roles and access
Four roles share one entry point: customer, merchant, courier/driver and admin. A user may hold multiple roles and switch between authorized roles without logging out. Authorization must be enforced in the database/backend using RLS/RBAC, never merely by hiding UI.

## 3. Authentication and security
- Production authentication uses Supabase Auth.
- Never store plaintext passwords or application-managed password hashes in public profile tables.
- Phone + password is the intended user login experience. SMS OTP is not required at this stage.
- Repeated failed-login protection/rate limiting should be implemented appropriately.
- Sensitive contact information is revealed only to authorized order participants at the allowed order stage.
- All production tables containing user/business data require appropriate RLS.
- Prevent cross-customer, cross-merchant and unauthorized driver access.
- Admin elevation/account creation must use trusted backend paths.
- Sensitive integrations and secrets run server-side/Edge-side only.
- Audit sensitive admin/security actions.
- Do not use localStorage as the source of truth for authorization, roles, orders, balances, availability or other authoritative business state.

## 4. Customer requirements
Core customer flow:
1. Browse nearby stores/restaurants/services and filter by category.
2. View store details, products/menu, price, availability and rating.
3. Cart supports one or multiple stores while preserving correct per-store order ownership.
4. Capture a useful delivery address; support saved addresses and later map/location selection.
5. Checkout shows products, delivery fees and authoritative total.
6. Track order stages: received -> preparing -> ready -> on the way -> delivered, with rejected/cancelled handling where supported.
7. Reveal merchant/driver contact information only when permitted.
8. Order history and convenient reorder behavior.
9. Ratings/reviews after eligible delivered orders.
10. Favorites, order notes and in-app notifications where implemented.
11. Handle unavailable inventory, closed stores, stale state and network failure safely.

There is no minimum-order enforcement above 0 unless explicitly requested later. Coupon discounts at checkout are currently disabled.

## 5. Merchant requirements
- Product/menu CRUD: name, image where supported, price, availability and stock.
- Incoming orders: accept/reject, preparation time, preparing and ready transitions.
- Merchant isolation: a merchant cannot access another merchant's private store/order data.
- POS/sales functionality where retained by the product scope.
- Daily/weekly/monthly sales reporting.
- Inventory/out-of-stock warnings.
- Merchant application/onboarding flow.
- Store working/open state and settings where implemented.
- Contact details only at permitted stages.

## 6. Courier/driver requirements
- Driver application/approval lifecycle.
- Persisted available/not-available duty state.
- View eligible nearby/available orders.
- Atomic order acceptance so two drivers cannot successfully claim the same assignment.
- Capacity/batching rules must be enforced authoritatively.
- Delivery lifecycle and completed-order history.
- Earnings reporting; current business assumption is 100% of configured driver delivery earnings unless explicitly changed.
- GPS/location and OSM/Leaflet navigation/location UI.
- Report-issue/complaint support where implemented.
- Safe behavior during network loss/retry/reload.

## 7. Admin requirements
- Secure administration of users, merchants, drivers/applications and orders.
- Activate/deactivate and approval operations through authorized paths.
- Complaints/issues management.
- Audit-log visibility.
- Maintenance/platform settings.
- Usage/free-tier monitoring where data is available, without fabricating provider metrics.
- Never expose admin functionality solely because of client-side state.

## 8. End-to-end order flow
Customer browses -> cart -> address/checkout -> authoritative order creation -> merchant accepts/prepares -> order becomes ready -> eligible driver accepts atomically -> on the way -> delivered -> rating/history.

Server/database constraints must reject invalid state transitions and unauthorized mutations. Client-calculated prices/totals are display aids; authoritative writes must validate prices, quantities, fees and totals against trusted data.

## 9. Payments and commercial rules
- Supported product model remains free-tier oriented.
- Current payment representations: cash and merchant-paid-online where required by the implementation.
- Do not introduce a paid payment gateway unless explicitly requested.
- Coupons/checkout discount enforcement remains disabled unless explicitly re-enabled.
- Do not add platform commissions or subscriptions unless explicitly requested.

## 10. Data model expectations
Production schema should cover, at minimum:
- profiles/users (non-secret profile data)
- user_roles
- stores
- products/menu_items
- orders
- order_items
- courier/driver state and assignments
- merchant applications
- driver applications
- ratings/reviews
- notifications
- complaints
- audit logs
- platform/settings data where necessary

Use migrations, constraints, indexes, foreign keys and RLS policies. Security-sensitive PIN/trusted-device data may use dedicated tables when required; PIN material must be securely hashed/verified and never stored plaintext.

## 11. UI/UX requirements
- Arabic only for user-facing production UI unless multilingual support is explicitly enabled later.
- RTL everywhere.
- Mobile-first and touch-friendly.
- Accessible labels, keyboard behavior, focus states and sufficient contrast.
- Dark mode may be retained.
- Login/signup is a marketing-facing product screen. Do not expose implementation language such as “one account combines roles”, “without email”, “without SMS”, mock/test credentials or security architecture. Replace with useful customer-facing Arabic benefits.
- Registration must be reachable and functional.

## 12. PWA, offline and network failure
- Installable PWA with valid manifest and service worker.
- Service worker must not leak private/authenticated API responses between users.
- Browser-safe service-worker behavior and assertions.
- Provide useful offline/network-error states.
- Do not show success before authoritative writes complete.
- Retry logic must not duplicate orders or other mutations.
- Reload/session/persisted driver availability behavior must be tested.

## 13. Testing and acceptance
Before claiming production readiness, execute and fix:
- TypeScript/typecheck.
- Lint.
- Unit/integration tests where present.
- Production build.
- Playwright E2E.
- RLS/security negative tests.
- Network-failure/retry tests.
- PWA/service-worker tests.
- Mobile viewport and basic accessibility checks.

Critical E2E scenarios include:
- Signup, login, logout and session restoration.
- Production-safe login/signup copy.
- Customer browse -> cart -> checkout -> tracking/history.
- Merchant order acceptance/preparation/ready flow.
- Driver persisted availability, acceptance, capacity and delivery.
- Competing drivers attempting to accept the same order.
- Cross-user/cross-merchant/unauthorized access attempts.
- Invalid order transitions.
- Network failure before/during important writes and safe retry.
- PWA/service worker/installability behavior.

Playwright state setup must be deterministic. Prefer accessible resilient locators and avoid ambiguous/exhaustive selectors that match unintended elements.

## 14. Production definition of done
The app is not done because a page renders or `npm run build` succeeds. A production milestone is complete only when the required behavior is implemented, security boundaries are enforced, relevant automated tests pass, build/lint/type checks pass, no known critical regression remains, and environment/deployment documentation is reproducible.

If external credentials/configuration block a verification step, record exactly what is blocked and what the owner must configure; never fabricate successful test or deployment results.

## 15. Historical prototype
The supplied Phase-1 `index.html` is a workflow/design reference using in-memory mock data. It is not production data architecture. Production work must replace mock state with Supabase-backed services and security controls rather than copying prototype security assumptions.

## 16. Agent implementation instruction
Read `AGENTS.md` before modifying the repository. Preserve the requirements above unless the repository owner explicitly changes them. When uncertain, choose the safer implementation, keep the Arabic RTL user experience, test the behavior, and document any genuine blocker.