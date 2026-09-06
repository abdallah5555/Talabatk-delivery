# Codex — Start Here

Read `AGENTS.md` and `docs/Talabatk_Delivery_Master_Requirements.md` completely before implementation.

## First assignment

Treat this as a production rebuild, not a toy prototype.

1. Audit repository instructions and create a short implementation plan mapped to the requirements.
2. Scaffold React + Vite + TypeScript with Arabic RTL mobile-first shell.
3. Establish Supabase client boundaries, typed data layer and migrations with RLS from the start.
4. Implement authentication and real reachable signup/login using production-safe Arabic marketing copy.
5. Implement RBAC/multi-role behavior without trusting browser storage.
6. Build the complete customer -> merchant -> driver -> delivered lifecycle with authoritative totals and state transitions.
7. Implement remaining merchant, driver and admin requirements.
8. Add PWA/offline/network-safe behavior.
9. Add deterministic Playwright E2E and security/RLS negative coverage.
10. Run typecheck/lint/tests/build/E2E and fix failures rather than documenting them away.
11. Prepare Vercel/Supabase deployment configuration without committing secrets.
12. Leave a final status with commands/results and any genuinely external blocker.

## Non-negotiable checks

- No mock/test accounts or technical architecture copy exposed on production login/signup.
- No plaintext passwords/PINs/secrets.
- No client-only authorization.
- No cross-tenant data leakage.
- No non-atomic driver claiming.
- No success UI before authoritative writes succeed.
- No brittle E2E state shared between tests.
- No claim of production readiness without the full test gate.

If a Supabase/Vercel credential or external configuration is unavailable, complete everything that can be completed locally, make the missing configuration explicit, and keep the repo reproducible.