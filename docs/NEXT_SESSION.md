# MergeEarn — Next Session Handoff

> Persistent handoff for humans and AI agents. The repository is the permanent source of truth.

## Resume rule

If a future session starts with the MergeEarn repository URL and asks to continue/finish:

1. Read `AGENTS.md`, `PROJECT_PLAN.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `docs/DECISIONS.md`, and this file.
2. Inspect current `main`, open PRs/issues, latest CI, current Vercel production deployment, and production runtime errors.
3. Continue the highest-priority incomplete release gate directly.
4. Do not ask the user to repeat product context already present in the repository.
5. Never claim 100% until the deployed real Issue -> Pay flow succeeds.

## Product identity

**Name:** MergeEarn  
**Type:** responsive SaaS web app designed for the Nimiq Mini App/Nimiq Pay experience  
**Pitch:** Turn GitHub issues into paid, verified work.

Core loop:

`Issue -> Bounty -> Fund -> Claim -> Pull Request -> Merge -> Verify -> Approve -> Pay`

Locked boundaries:

- GitHub is the canonical source of code-work state.
- Nimiq is the canonical source of payment state.
- AI is advisory only and never payment authority.
- Money-sensitive states require trusted-server verification.
- Never fake `FUNDED`, `VERIFIED`, `APPROVED`, or `PAID`.

## Current code state — 2026-09-15

Production hardening PR #4 was merged. The current release candidate includes:

- Vercel-compatible trusted `/api/*` backend.
- Dedicated Supabase schema and audit/payment persistence.
- GitHub OAuth/session encryption.
- Server-side repository maintainer capability checks.
- Creator-only funding UI/backend policy.
- Claimant-or-maintainer PR verification path with canonical repository/base/merge checks.
- Maintainer approve/pay authorization.
- Official `@nimiq/mini-app-sdk` wallet flow.
- Server-side Nimiq transaction verification before `FUNDED`/`PAID`.
- Idempotent funding/payout protections.
- Deterministic dependency versions and lockfile.
- `npm ci` CI.
- Supabase security/performance hardening migration.
- Competition submission, promotion, demo, release and security documentation.
- CI-integrated repository/history secret-pattern scanner.

## Infrastructure state

### Supabase

Dedicated production project exists:

- project ref: `ppqvnxrcwsdltzpdcwat`
- URL: `https://ppqvnxrcwsdltzpdcwat.supabase.co`
- region: `ap-southeast-1`

Applied migrations:

1. `supabase/migrations/202609140001_core.sql`
2. `supabase/migrations/202609140002_security_performance_hardening.sql`

Security/performance advisor findings discovered during setup were addressed by the hardening migration. Remaining RLS-no-policy informational findings are intentional because the browser does not directly access the application tables.

### Vercel

Intended project metadata reported by the local release environment:

- team id: `team_BsJXXtOBNmww7MhlgiE7JzzO`
- project id: `prj_4jtCSgC00hCLiLltKClnBxVXmBgh`
- canonical target URL: `https://mergeearn-saidur-droids-projects.vercel.app`

The active ChatGPT connector has had inconsistent read visibility for that project, so always verify against the authenticated release environment before relying on connector absence as proof the project does not exist.

Already reported as configured in Vercel Production by the release operator:

- `APP_URL`
- fresh `SESSION_ENCRYPTION_KEY`
- `AI_API_URL`
- `AI_MODEL`
- `NIMIQ_RPC_URL=https://rpc.nimiqwatch.com`

Still requiring verification/configuration before deploy:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `VITE_NIMIQ_FUNDING_ADDRESS`
- `NIMIQ_FUNDING_ADDRESS`
- `NIMIQ_PAYOUT_SOURCE_ADDRESS`
- optional `AI_API_KEY`

### Nimiq RPC

The local release environment reported smoke tests for `https://rpc.nimiqwatch.com`, including block number, consensus and `getTransactionByHash` support. Re-verify network identity/health from the deployed environment before the real E2E.

## Competition packaging

Canonical files:

- `docs/COMPETITION_SUBMISSION.md`
- `docs/SUBMISSION_FORM.md`
- `docs/PROMOTION_COPY.md`
- `docs/DEMO_RUNBOOK.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/SECURITY_RELEASE_CHECKLIST.md`
- `SECURITY.md`
- `CONTRIBUTING.md`

Current Cycle 2 prep in `docs/COMPETITION_SUBMISSION.md` records the current deadline, scorecard, positioning and portal references. Re-check the portal immediately before final submission in case fields/deadline guidance changes.

## Immediate execution order

1. Verify latest `main` CI is green, including secret scan.
2. Configure/verify all required production Vercel environment variables without exposing secret values.
3. Deploy current `main` to production.
4. Verify production URL, `/api/auth/session`, Supabase access, GitHub OAuth, repository/issue listing and Nimiq RPC.
5. Fix any blocking runtime/build issue and redeploy.
6. Run the real smallest-practical-value E2E using `docs/DEMO_RUNBOOK.md`.
7. Inspect audit/payment records and runtime logs.
8. Complete `docs/SECURITY_RELEASE_CHECKLIST.md`.
9. Stop for owner confirmation immediately before applying MIT and making the repository public.
10. After approval, add MIT License, make repo public, confirm public access and branch protection/ruleset where plan allows.
11. Capture screenshots/video, publish promotion posts, replace submission placeholders and submit.

## Owner-only / human-signature gates

Do not ask for manual work when a connected tool/browser can perform it. Stop only when genuinely required for:

- account login/password/passkey/2FA/CAPTCHA;
- billing/cost confirmation;
- Nimiq wallet unlock or transaction signature;
- final MIT/public-repository legal/release confirmation.

Never ask for or store a wallet seed phrase/private key.

## Definition of 100%

Only call MergeEarn **100% competition-ready** when:

- latest CI is green;
- production deployment is READY and reachable;
- GitHub OAuth and permission checks work live;
- real funding is independently confirmed before `FUNDED`;
- real expected PR merge state is independently verified;
- authorized maintainer approval is recorded;
- payout is signed and independently verified before `PAID`;
- payment/audit records persist;
- runtime logs show no blocking production errors;
- secret/history scan passes;
- owner-approved MIT license is present;
- repository is public as required for submission;
- competition submission is completed with working URLs.
