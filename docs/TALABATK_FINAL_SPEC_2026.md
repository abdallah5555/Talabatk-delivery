# Talabatk Delivery — Final Unified Product & Engineering Specification (2026)

## Status
This document is the **current binding implementation specification** for the new `Talabatk-delivery` repository. It merges the historical Talabatk/Talbak Delivery requirements, prior security hardening work, prior feature audits and the latest product decision:

- Android is a real native app distributed directly as APK.
- iPhone/iPad use the same project exported as an installable PWA.
- Admin is a protected role inside the same product.
- The backend is shared.
- The required product must remain usable with a **zero-cost stack** and must not require app-store publishing.
- Codex should treat this as **one complete delivery milestone** and should not stop for user approval between internal engineering phases.

---

## 1. Product vision
Talabatk Delivery (طلباتك دليفري) is a hyperlocal delivery platform connecting customers, merchants, couriers/drivers and admins. The application is Arabic-first, RTL, mobile-first, secure, resilient to weak networks and practical for small local operations without paid infrastructure dependencies.

### User-facing language
All production user-facing content is Arabic RTL. Internal code, types, test names and engineering documentation may be English.

---

## 2. Final platform architecture

### Universal frontend
Use a single React Native + Expo + TypeScript project.

Targets:
1. **Android native:** direct APK installation, no Google Play dependency.
2. **Web/PWA:** exported from the same Expo project, installable on iPhone/iPad from Safari and usable on desktop browsers.
3. **Admin:** protected application role using the same app and backend.

Use Expo Router so screens are deep-linkable and share a universal route structure.

### Backend
Use Supabase Free plan components only:
- PostgreSQL
- Supabase Auth
- Realtime
- Storage
- Edge Functions where privileged server-side integrations are required

### Server state
Use TanStack Query for server state, retry, cache invalidation and reconnection behavior. Supabase remains authoritative.

### Validation
Use TypeScript plus schema validation (Zod or equivalent open-source library) at app boundaries. Database constraints and server-side validation remain authoritative for sensitive operations.

---

## 3. Roles and identity

Roles:
- `customer`
- `merchant`
- `driver`
- `admin`

A user may hold more than one approved role and switch active UI roles without logging out. Role membership must come from server-authorized data (`user_roles` or equivalent), never from a client-controlled flag.

### Login/signup
Required experience:
- phone number + password
- real signup route
- real login/logout/session restore
- account disabled/suspended handling
- rate-limit/lockout strategy for repeated failures where feasible

Do not require paid SMS OTP. Do not expose technical architecture or internal auth decisions on the login screen.

### Secondary PIN / trusted device
Preserve the prior hardening direction:
- optional/required PIN re-authentication for sensitive flows according to implementation design
- PIN verification occurs server-side only
- never return `pin_hash` to a client
- attempt counter and temporary lockout after repeated failure
- support a trusted-device window using a random opaque per-install token validated server-side
- native device token should be stored using secure storage
- client storage never grants roles or authorization by itself

---

## 4. Customer feature set

### Discovery
- browse nearby stores/services
- categories: restaurants, supermarkets, pharmacies and extensible service categories
- store open/closed state
- store details, rating, working hours, delivery estimate, item availability
- server-side search across store names, products and useful tags using PostgreSQL search/indexing
- filters/sorting such as category, distance, rating, availability

### Store/menu
- products with name, description, image, current price, availability and stock where applicable
- product variants/options/add-ons when needed by menu data model
- clear out-of-stock behavior
- merchant promotional item price/offer may be supported without requiring a platform coupon engine

### Favorites
- favorite stores
- favorite products where useful
- dedicated favorites view

### Addresses/location
- multiple saved addresses such as home/work
- address fields: street, building, floor/unit where relevant, landmark, notes
- map location picking
- GPS permission optional/contextual
- manual address entry must always remain possible

### Cart
- persistent draft cart that survives safe reload/app restart
- multi-store cart support
- server must split/represent multi-store fulfillment safely so every merchant owns only the relevant suborder/items
- authoritative price refresh at checkout
- detect changed price or unavailable item before order submission

### Checkout
- full item summary
- server-authoritative subtotal/total
- delivery fee calculation based on configured free map/distance logic or approved estimate
- minimum order = 0
- payment modes in current scope:
  - cash
  - merchant-paid-online/manual recorded mode
- no payment gateway required
- coupon discounts at checkout are disabled unless explicitly re-enabled later
- order note
- scheduled order for later

### Order lifecycle
Customer can see a timeline such as:
- received/pending merchant
- accepted/preparing
- ready for pickup
- driver assigned
- picked up/on the way
- delivered
- rejected/cancelled where valid

Exact enum names may differ, but invalid transitions must be rejected server-side.

### Tracking
- realtime status updates
- realtime driver position during active delivery where permissions and lifecycle allow
- shareable/deep-linkable tracking route
- hide sensitive participant contact information until the lifecycle authorizes disclosure
- show reconnecting/stale GPS states clearly

### History and re-order
- order history
- order details
- “اطلب زي الأول” / reorder action
- price/availability revalidation before reordering

### Ratings/reviews
After delivered orders:
- rate driver
- rate store
- optional item-level feedback
- text comment where allowed
- prevent fake reviews by requiring a delivered order relationship

### Notifications
- in-app notification center backed by database/realtime
- unread badge/count
- order status notifications
- merchant rejection/change notifications
- driver assignment notifications
- Android push notifications when configured through a zero-cost push path
- PWA notifications where browser/platform support permits

### Complaints/support
- submit complaint/report linked to an owned order
- category + description + optional evidence if storage limits permit
- track complaint status

### Account/privacy
- profile editing
- role requests/applications where applicable
- account/data deletion request path
- logout from session

---

## 5. Merchant feature set

### Merchant application/approval
- merchant role requires approved application unless admin-created
- application status: pending/approved/rejected/suspended as appropriate
- admin can review supporting information without exposing unrelated private data

### Store management
- store profile
- category
- address/map position
- opening hours
- manual open/closed override
- service area configuration where supported
- store image/logo using compressed uploads

### Product/menu management
- add/edit/archive/delete product where safe
- product image
- price
- optional sale price/offer
- description
- availability
- stock quantity
- categories within menu
- variants/add-ons if schema includes them

### Incoming orders
- realtime new-order alert
- accept/reject with reason where useful
- preparation time estimate
- status updates through merchant-owned valid transitions
- mark ready for pickup
- merchant cannot access or mutate another merchant’s order

### Customer/driver details
Reveal only after lifecycle authorization. Never expose unrelated users.

### Inventory
- stock tracking
- low/out-of-stock indicators
- prevent checkout of unavailable inventory through server-side validation
- update stock atomically with completed order logic where appropriate

### POS/manual sales
Preserve previous POS scope:
- record counter/manual sales
- invoice/receipt representation
- calculate daily revenue
- keep POS records separated from delivery order semantics where needed

### Reporting
- daily/weekly/monthly order counts
- revenue summary
- best-selling items
- order-status distribution
- CSV export for merchant-owned data

---

## 6. Driver/courier feature set

### Driver application/approval
- application form
- pending/approved/rejected/suspended states
- admin review
- unapproved drivers cannot claim real orders

### Availability
- persistent On Duty / Off Duty state backed by database
- restore state correctly after reload/app restart
- no client-only availability source of truth

### Location/GPS
- update only own driver location
- active-delivery tracking
- configurable update frequency to reduce battery/network usage
- stale-location timestamp
- graceful handling of permission denial, GPS loss and network loss
- privacy-oriented retention: do not retain high-frequency location indefinitely without operational need

### Available orders
- show eligible nearby orders according to lifecycle, location, capacity and approval state
- do not expose sensitive customer contact before acceptance

### Atomic acceptance
- order claim must be transactional/race-safe
- competing drivers cannot both claim the same order
- server validates driver availability/approval/capacity

### Capacity and batching
- support accepting multiple orders when capacity rules allow
- capacity is server-controlled
- route grouping/batching rules should avoid impossible assignments
- suggest ordering of batched stops by reasonable distance heuristic

### Delivery lifecycle
- accepted
- pickup progression
- on the way
- delivered
- report issue / unable to complete flow
- invalid/skipped transitions rejected server-side

### Earnings
- delivery earnings history
- daily/weekly totals
- simple chart/summary
- current business rule: driver keeps 100% of delivery fee; platform commission is 0

### Issue reporting
- wrong address
- customer unavailable
- merchant delay
- vehicle/route issue
- other report to admin

---

## 7. Admin feature set

Admin is a secure role inside the same app. UI visibility alone is never authorization.

### Users and roles
- list/search users
- activate/deactivate/suspend
- view approved roles
- approve/reject merchant applications
- approve/reject driver applications
- role assignment/elevation only through privileged server-side operation

### Stores/products
- inspect stores
- suspend/restore store
- inspect merchant status
- moderation controls where needed

### Orders
- view all orders by status/date/store/customer/driver
- inspect lifecycle timeline
- investigate stuck orders
- perform narrowly-scoped admin intervention with audit record

### Complaints/issues
- unified complaint queue
- status/priority/category
- link to relevant order/user/store/driver
- admin notes
- resolution record

### Audit log
Log sensitive actions such as:
- role changes
- account suspension/reactivation
- store suspension
- admin order override
- settings changes
- complaint resolution changes

Audit entries must not contain secrets.

### Platform settings
- maintenance mode
- service areas enable/disable
- delivery-fee parameters
- driver capacity defaults
- operational text/settings that are safe to expose
- no secret tokens editable in public client UI

### Free-tier/health dashboard
Track useful internal usage indicators without depending on a paid management API:
- application row counts
- storage usage estimates if accessible
- realtime/application event counters if practical
- recent Edge Function failure metrics if accessible
- warning thresholds
- service status / maintenance state

Do not pretend exact provider billing values are available when they are not. Prefer accurate locally measurable counters and manual admin reference fields where provider APIs are unavailable.

### Suspicious activity indicators
Simple rule-based flags, e.g.:
- unusually high cancellations
- repeated failed PIN/login attempts
- excessive order creation in a short window
- repeated complaint abuse

This is for admin review, not automatic permanent bans without clear policy.

### Analytics
Use application-owned SQL aggregates rather than requiring a paid analytics vendor:
- new users
- orders over time
- completion/cancellation rates
- most active areas
- best stores/products
- merchant/driver performance aggregates

---

## 8. Database/domain model

Codex may refine names, but expected tables/entities include:
- profiles/users public profile data
- user_roles
- role/applications tables for merchant/driver
- trusted_devices
- PIN security fields/table as appropriate
- stores
- store_hours
- menu_categories
- menu_items/products
- product_options/variants if implemented
- favorites
- saved_addresses
- orders
- order_groups or equivalent for multi-store parent grouping
- order_items
- order_status_history/events
- driver_profiles/state
- driver_locations (current + minimal history model)
- reviews/ratings
- notifications
- push_tokens
- complaints
- audit_logs
- app_settings
- service_areas
- usage_metrics/application counters
- POS sales/items where needed

All exposed tables require RLS. Public/readable catalog data should expose only safe fields.

---

## 9. Secure server operations / RPC expectations

Sensitive operations should use transactional database functions/RPCs or Edge Functions where appropriate:
- `create_order_secure`
- merchant order transition operation
- atomic driver order acceptance
- driver delivery-step update
- secure PIN verification
- admin role/approval operations
- complaint operations where cross-table validation is required

### Critical rules
- calculate item prices/totals server-side from current database data
- identify products by stable IDs, not product names
- validate store ownership from authoritative `orders.store_id`/relations
- no direct client writes to sensitive totals/ownership fields
- use transaction/locking/atomic conditional updates for driver claim and capacity
- grant EXECUTE only to intended authenticated roles
- no unnecessary `PUBLIC`/`anon` execution on SECURITY DEFINER functions

---

## 10. RLS acceptance matrix

At minimum:

### Customer
- reads/updates own safe profile fields only
- reads public store/menu catalog safe fields
- reads own orders
- creates orders only through secure path
- cannot set authoritative total/store/customer ownership fields directly
- sees own notifications/favorites/addresses/reviews/complaints

### Merchant
- reads/updates own store/menu data
- sees only orders belonging to owned stores
- changes only merchant-authorized order transitions
- cannot modify payment totals/customer ownership/driver ownership

### Driver
- sees eligible available orders with masked private information
- sees full assigned-order data only after authorization
- updates only own driver location/state via allowed paths
- cannot change arbitrary order fields

### Admin
- admin access requires authoritative role verification
- privileged operations produce audit entries

Negative tests for these cases are mandatory.

---

## 11. Realtime and notifications

Use Supabase Realtime efficiently for:
- merchant incoming orders
- order status changes
- driver assignment/claim
- active order tracking
- notification inbox updates

Avoid excessive channels/messages. Subscribe only to relevant user/store/order scopes and unsubscribe cleanly.

Android push can use Expo Push service when credentials/configuration are available without paid service dependency. The application must remain functional via in-app realtime notifications if push configuration is not yet available.

---

## 12. Maps and routing

### Rendering
Use MapLibre-compatible open-source mapping libraries.

### Data/styles
Use OpenStreetMap-derived data. Prefer OpenFreeMap or another currently zero-cost provider that explicitly allows the usage. Provider URL must be configurable so it can be swapped without app rewrite.

### Rules
- show attribution
- no paid Google Maps API
- no bulk prefetching against OSM community tile servers
- no offline map download unless the selected tile source explicitly permits it

### Distance/routing
For required v1 operation, distance/fee logic may use:
- geodesic distance and configurable local multiplier/fee formula, or
- a genuinely free/open routing option if it can be deployed without violating zero-cost policy

Do not block the product on a paid routing API.

---

## 13. PWA/iPhone requirements

The web export must include:
- valid PWA manifest
- icons
- theme/background colors
- standalone display behavior
- Safari Home Screen compatibility
- Workbox service worker
- safe update behavior
- deep links
- offline shell/basic safe cached views
- Arabic offline/retry screen

Service-worker cache policy:
- static assets: cache-first/versioned
- product/store images: stale-while-revalidate where appropriate
- authenticated Supabase API: do not persist private responses in a cross-user cache
- network mutations: never fake success offline

---

## 14. Android APK requirements

- Expo project can prebuild/run Android.
- Configure a direct-install APK build profile or local Gradle release path.
- No Google Play dependency.
- Document local commands for free builds using Android Studio/JDK/Gradle.
- Do not commit signing secrets/keystore passwords.
- Native permissions are declared only when actually needed (location, notifications, images/camera if used).

---

## 15. Network failure / offline resilience

Required scenarios:
- API temporarily unavailable
- device loses network mid-checkout
- request times out after user taps submit
- mutation succeeds server-side but response is lost
- realtime disconnect/reconnect
- stale cached catalog
- GPS unavailable

Rules:
- use idempotency key/deduplication for order creation
- no duplicate order on retry
- preserve safe draft cart/order note
- clearly show pending/failed/retry state
- reconcile with authoritative server state after reconnect

---

## 16. Performance

- lazy-load role-specific heavy screens and maps
- paginate server-side
- virtualize long lists
- compress images before upload and enforce max dimensions/file size
- appropriate indexes for orders/status/store/date/search/location queries
- avoid high-frequency unnecessary GPS writes
- avoid aggressive realtime subscriptions
- use cached server state with correct invalidation

---

## 17. Accessibility and UX quality

- touch-friendly targets
- screen-reader labels
- text scaling/zoom
- sufficient contrast
- no blanket `user-select:none` on web text
- logical keyboard/focus behavior on PWA
- safe-area support on Android/iPhone PWA
- loading, empty, error and success states in Arabic

### Login/signup copy
Login/signup is a marketing/customer experience surface. Never show phrases describing internal architecture such as one account having multiple roles, “no SMS”, “no email”, mock accounts or security implementation.

---

## 18. Privacy and data minimization

- keep only required personally identifiable information
- do not expose phone numbers before order authorization
- minimize long-term driver location history
- provide account/data deletion request flow
- no secrets in analytics/audit logs
- HTTPS only in production

---

## 19. Explicitly excluded paid/disabled scope

Do NOT implement these as required dependencies:
- Google Maps API
- SMS OTP
- Firebase Phone Auth
- paid Supabase PITR
- paid database backups
- Paymob/Kashier/Stripe payment gateway
- app-store publishing
- paid Sentry/analytics dependency
- paid map/routing/geocoding provider

Current product decisions:
- minimum order enforcement above zero: disabled
- checkout coupons: disabled
- Proof-of-Delivery PIN: not required unless user explicitly re-enables it
- payment gateway: disabled

---

## 20. Free replacements for older paid/outdated suggestions

### Backups
Older audits suggested Supabase PITR. Do **not** enable it. Instead:
- provide documented manual/local `pg_dump` backup flow where supported
- add admin export for safe business data (CSV/JSON without secrets)
- optionally create a GitHub/local scheduled script only if it can run within free quotas and credentials can be stored securely

### Error monitoring
Do not require Sentry. Use:
- structured client error boundary/logging
- application-owned error/event table with sampling/redaction where useful
- console/dev diagnostics
- GitHub CI failures

### Analytics
Do not require Umami/Plausible hosting. Use SQL/application event aggregates first.

### OTP
Do not require WhatsApp/SMS OTP. Preserve phone+password and server-side security controls without a paid messaging dependency.

### Payments
Record supported manual modes only; no external gateway.

---

## 21. Testing requirements

### Unit/domain
- total/fee helper behavior
- state transition rules
- validation helpers
- retry/idempotency helpers

### Database/security integration
- RLS cross-customer denial
- merchant cannot read/update another store/order
- driver cannot modify another driver location
- driver cannot read protected contact before claim
- user cannot self-promote role/admin
- customer cannot tamper total
- duplicate/competing driver acceptance yields exactly one winner
- invalid state transitions denied
- complaint must relate to authorized order/user
- review requires delivered relationship

### E2E — customer
- signup/login/logout/session restore
- browse/search/filter
- store/product/cart
- address/checkout
- submit order
- realtime status tracking
- reload/reconnect
- reorder
- favorites
- ratings/complaints

### E2E — merchant
- application/approval state
- menu CRUD
- availability/stock
- accept/reject/prepare/ready
- isolation from other merchant
- reports/POS basic flows

### E2E — driver
- application/approval
- availability persistence
- GPS permission states
- available orders
- atomic claim
- batching/capacity
- delivery lifecycle
- earnings/report issue

### E2E — admin
- admin-only route/access
- user/application moderation
- order/complaint management
- maintenance/settings
- audit log generated for sensitive actions

### PWA/network
- manifest
- service worker
- update safety
- deep links
- offline shell
- network failure during mutation
- retry without duplicate order

### Android
At minimum validate:
- prebuild/build configuration
- app launch
- auth screen
- navigation
- core API connectivity
- required native permissions

---

## 22. CI quality gate
CI should run available checks such as:
- install
- typecheck
- lint
- unit/integration tests
- production web export/build
- deterministic E2E where environment/secrets are available

Database migrations and RLS tests should have a reproducible documented test process.

---

## 23. Definition of Done
Codex must not stop at planning, scaffolding, an audit or a successful compile. The milestone is complete only when:
- complete required UI/feature scope exists
- schema/migrations/RLS/RPCs exist and are reproducible
- production business state uses Supabase rather than mock data
- security invariants are enforced and negatively tested
- customer/merchant/driver/admin critical flows pass
- offline/network recovery is implemented
- PWA export works and is installable
- Android APK build path is configured and verified as far as the available environment permits
- no required service can unexpectedly bill the user
- setup/env/deployment/build instructions are complete
- final status records actual commands/results and external blockers only

Internal phases are allowed for engineering organization, but **the user has explicitly authorized a single end-to-end implementation pass. Do not stop to request approval between internal phases.**