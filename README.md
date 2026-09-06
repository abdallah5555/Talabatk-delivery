# Talabatk Delivery — طلباتك دليفري

Production-development repository for **طلباتك دليفري**, an Arabic RTL hyperlocal delivery PWA for customers, merchants, couriers/drivers and administrators.

## Start here — Codex

**Before writing code, read these files in order:**

1. [`AGENTS.md`](./AGENTS.md) — binding engineering, security and testing instructions.
2. [`docs/Talabatk_Delivery_Master_Requirements.md`](./docs/Talabatk_Delivery_Master_Requirements.md) — product scope and acceptance requirements.
3. [`.env.example`](./.env.example) — browser-safe environment variable names.

Do not silently reduce product scope. Do not claim a feature/test/deployment is complete unless it was actually implemented and verified.

## Target stack

- React + Vite + TypeScript
- Supabase: PostgreSQL + Auth + RLS + Realtime where appropriate
- Playwright E2E
- PWA manifest + service worker
- OpenStreetMap + Leaflet
- Vercel

## Product rules

- All user-facing production UI is **Arabic + RTL**.
- Mobile-first responsive UX.
- Four roles: customer, merchant, courier/driver and admin.
- A user can hold multiple authorized roles.
- Supabase/database is the production source of truth.
- Never use localStorage as an authorization or authoritative business-data source.
- Never commit secrets or service-role credentials.
- RLS/security boundaries are mandatory and must be tested.
- Login/signup must use product/marketing Arabic copy, not internal implementation explanations or test credentials.

## Current repository state

This repository is intentionally prepared as a clean Codex implementation workspace. The historical Phase-1 prototype was a single-file in-memory mock used to prove the UX/order workflow; it is **not production architecture**. Its functional intent is captured in the master requirements and agent instructions. Production implementation should use modular React/TypeScript and Supabase-backed services/migrations rather than recreating the mock database model in the browser.

## Environment

Copy `.env.example` to `.env.local` locally and provide the project-specific public Supabase values. Never commit `.env.local`.

Expected public variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Privileged secrets belong in Supabase/Vercel server-side secret configuration, never `VITE_*` variables.

## Completion gate

Before a production milestone is called complete, Codex must run/fix type checks, lint, production build, relevant automated tests, Playwright critical E2E, security/RLS negative cases, network-failure scenarios and PWA/service-worker checks. See `AGENTS.md` for the full gate.
