# Codex Environment & Infrastructure Access

This document tells Codex exactly which live resources belong to the new Talabatk Delivery implementation and which legacy resources must not be modified accidentally.

## GitHub

**Current repository (authoritative codebase):**
- `abdallah5555/Talabatk-delivery`
- Default branch: `main`

**Legacy repository:**
- `abdallah5555/Talbak-delivery`
- Do not treat it as the active codebase. It may be inspected only for historical implementation ideas if useful.

## Supabase

**Selected existing project for reuse + hardening:**
- Name: `talbak-delivery`
- Project ref / ID: `vriwhtuxagnbfxybjviz`
- Region: `eu-north-1`
- Status at environment preparation time: `ACTIVE_HEALTHY`
- Project URL: `https://vriwhtuxagnbfxybjviz.supabase.co`

The repository `.mcp.json` scopes the Supabase MCP server to this exact project. Authenticate the MCP connection with OAuth when Codex first requests Supabase tools.

### Browser-safe public client configuration
The current publishable client key is intentionally browser-safe and is prefilled in `.env.example`. Never replace it with a service-role/secret key in client code.

### Existing schema discovered during preparation
The existing project already contains important production-shaped tables including:
- `profiles`
- `user_roles`
- `stores`
- `menu_items`
- `orders`
- `order_items`
- `addresses`
- `favorites`
- `notifications`
- `complaints`
- `store_reviews`
- `merchant_applications`
- `driver_applications`
- `driver_status`
- `inventory_items`
- `inventory_movements`
- `audit_logs`
- `coupons`

RLS was enabled on all discovered `public` tables at preparation time. This does **not** mean the policies/functions are automatically safe; Codex must still audit them against the final specification.

### Existing security warnings that Codex must resolve
Supabase security advisors reported warnings for exposed `SECURITY DEFINER` functions callable by `authenticated`, including examples such as:
- `admin_get_usage_metrics()`
- `auto_assign_nearest_driver(uuid)`
- `create_order_secure(...)`
- `customer_cancel_order(uuid)`
- `driver_accept_order(uuid)`
- `driver_update_order(...)`
- `merchant_update_order(...)`
- `update_driver_location(...)`
- `validate_coupon(...)`

These functions may be intentionally exposed, but they must be reviewed one-by-one. Codex must verify internal authorization, safe `search_path`, least-privilege EXECUTE grants, lifecycle/ownership checks, atomicity and RLS interactions. Do not blindly revoke or convert them without preserving the intended product flow.

Supabase also reported leaked-password protection disabled. Codex should verify whether enabling the current free-plan feature is possible without violating the zero-cost policy; if it is paid or unavailable, document the limitation instead of enabling billing.

### Database working rule
Before destructive schema changes:
1. inspect existing tables/functions/policies/migrations;
2. preserve compatible useful schema/data;
3. generate new migrations for changes;
4. run security/performance advisors after DDL;
5. verify with negative RLS/RPC tests.

Do not enable paid Supabase branching or PITR.

## Vercel

**Account/team:**
- Team name: `abdallah`
- Team slug: `abdallah-a17f`
- Team ID: `team_IlAVJa9RpG1jhOFW974WTEOr`
- Plan: `hobby`

### Legacy Vercel project — do not overwrite
Existing project:
- Name: `talbak-delivery`
- Project ID: `prj_6ltMK24E9U884LPUn8TZRm2piBLz`
- Linked repository: `abdallah5555/Talbak-delivery` (legacy spelling/repository)

The new codebase must use a **new Vercel project** linked to:
- `abdallah5555/Talabatk-delivery`
- desired project name: `talabatk-delivery`

Do not relink or overwrite the legacy `talbak-delivery` Vercel project unless the user explicitly changes this instruction.

The repository `.mcp.json` includes Vercel MCP. Authenticate with Vercel OAuth on first use. Once the Expo web/PWA build exists, Codex should create/link the new Vercel project, configure the web build/output settings, set only browser-safe public variables there, deploy, inspect build/runtime logs, and update `EXPO_PUBLIC_WEB_BASE_URL` documentation/config to the real production PWA URL.

## MCP configuration
Project `.mcp.json` contains:
- project-scoped Supabase MCP with database/debugging/development/functions/storage/docs tools
- Vercel MCP

OAuth authorization is intentionally not committed. Codex may trigger the provider login/consent flow the first time those MCP servers are used.

## Secrets policy
Never commit or print:
- `SUPABASE_SERVICE_ROLE_KEY`
- Supabase secret keys
- database passwords
- Telegram bot tokens
- private FCM credentials
- signing keystores/passwords
- Vercel personal access tokens

Use OAuth-based MCP and provider secret stores instead.

## Codex infrastructure objective
Codex should be able to:
1. read/write the GitHub repository;
2. inspect and modify the scoped Supabase project through migrations/MCP;
3. deploy Supabase Edge Functions where the final architecture requires them;
4. create/link the new Vercel project to this repository when the web export is ready;
5. configure public environment variables and deploy the PWA;
6. inspect deployment/build logs and fix failures;
7. build/configure a direct-install Android APK path;
8. continue until the repository Definition of Done is reached, stopping only for a provider OAuth/credential/console approval that cannot be completed by the agent itself.
