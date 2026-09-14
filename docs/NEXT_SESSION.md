# MergeEarn — Next Session Handoff

> Persistent handoff for humans and AI agents. **The GitHub repository is the permanent source of truth.** A future session should be able to resume from only `https://github.com/Saidur-droid/MergeEarn` without asking the owner to repeat prior context.

## Resume rule

If a future session starts with the MergeEarn repository URL and asks to continue/finish:

1. Read `README.md`, `AGENTS.md`, `PROJECT_PLAN.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `docs/DECISIONS.md`, and this file.
2. Inspect current `main`, open PRs/issues, latest CI, current Vercel production deployment, and production runtime errors.
3. Continue the highest-priority incomplete release gate directly.
4. **Do not ask the owner to repeat product context already present in the repository.**
5. Do not restart completed setup from scratch unless current evidence shows it is broken.
6. Never claim 100% until the deployed real Issue -> Pay flow succeeds.

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

## Current verified state — 2026-09-15

### Repository / code

Repository: `https://github.com/Saidur-droid/MergeEarn`

The repository is now **PUBLIC**.

MIT `LICENSE` is present. The license was added in commit:

`fe778ca5a16121e082722c728344a281cfb1667b`

Windows release automation was added at repository root:

`finish-mergeearn.ps1`

Automation commit:

`4efd9ab0706939bd6d6aab7a365538943e466e0f`

CI run #35 for that commit completed successfully.

The owner cloned the repo locally to:

`C:\Users\win10\MergeEarn`

The release script has already verified on the owner's Windows machine:

- Node.js `22.23.1`
- `npm ci`
- `npm run scan:secrets`
- `npm run typecheck`
- `npm test` -> **20/20 tests passed**
- `npm run build`
- latest GitHub CI -> success
- Nimiq RPC `getBlockNumber` smoke test -> success
- npm audit during install -> `0 vulnerabilities`

Do not make the owner rerun or re-explain these results unless needed after a new code change.

### Implemented release candidate

- Vercel-compatible trusted `/api/*` backend.
- Dedicated Supabase schema and audit/payment persistence.
- GitHub OAuth/session encryption.
- Server-side repository maintainer capability checks.
- Creator-only funding UI/backend policy.
- Claimant-or-maintainer PR verification with canonical repository/base/merge checks.
- Maintainer approve/pay authorization.
- Official `@nimiq/mini-app-sdk` wallet flow.
- Server-side Nimiq transaction verification before `FUNDED`/`PAID`.
- Idempotent funding/payout protections.
- Deterministic dependency versions and lockfile.
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

Latest advisor status checked during release work:

- security: only `rls_enabled_no_policy` INFO findings remain; intentional because application tables are not directly exposed to browser clients and the trusted backend uses privileged access.
- performance: only unused-index INFO findings on the fresh database; not a release blocker.

### Vercel — CURRENT BLOCKER

Expected MergeEarn Vercel scope/project metadata:

- team name: `saidur-droid's projects`
- team slug: `saidur-droids-projects`
- team id: `team_BsJXXtOBNmww7MhlgiE7JzzO`
- previously reported project id: `prj_4jtCSgC00hCLiLltKClnBxVXmBgh`
- canonical target URL: `https://mergeearn-saidur-droids-projects.vercel.app`

**Exact blocker at end of 2026-09-15 session:**

The owner successfully completed Vercel device authorization, but the local Vercel CLI authenticated into the wrong account/team:

- logged-in username: `murphyalex899-6693`
- active team: `rif-s-project` / `rif's project`

`npx --yes vercel@latest teams ls` only showed `rif-s-project`.

Because `finish-mergeearn.ps1` intentionally targets `saidur-droids-projects`, it stopped safely with:

`[BLOCKED] Could not link the existing Vercel project 'mergeearn'. Do not create a duplicate project.`

**Do not create a second MergeEarn Vercel project before resolving the account/team mismatch.**

### Exact next action for Vercel

From `C:\Users\win10\MergeEarn`, authenticate the CLI into the Vercel account that owns `saidur-droid's projects`:

```powershell
npx --yes vercel@latest logout
npx --yes vercel@latest login --github
npx --yes vercel@latest whoami
npx --yes vercel@latest teams ls
```

The success condition is that `teams ls` includes:

`saidur-droids-projects    saidur-droid's projects`

If browser session caching keeps signing into the wrong account, explicitly sign out of Vercel/GitHub in that browser or use a private/incognito browser window and authenticate with the GitHub/Vercel identity that owns the target team.

Once the correct team is visible, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\finish-mergeearn.ps1
```

The script will resume the release workflow and handle as much as possible automatically.

### Production environment contract

The script verifies/configures these production names:

- `APP_URL`
- `SESSION_ENCRYPTION_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `VITE_NIMIQ_FUNDING_ADDRESS`
- `NIMIQ_FUNDING_ADDRESS`
- `NIMIQ_PAYOUT_SOURCE_ADDRESS`
- `NIMIQ_RPC_URL`
- `AI_API_URL`
- `AI_MODEL`

Optional:

- `AI_API_KEY`

Never put secrets in chat, repository files, screenshots, or shell history when avoidable. Secret prompts in `finish-mergeearn.ps1` are designed to avoid printing sensitive values.

### GitHub OAuth

If GitHub OAuth credentials are still absent when the script reaches that gate, the browser must create/configure the OAuth App because ordinary user OAuth App creation is not reliably available through GitHub REST.

Required values:

- Application name: `MergeEarn`
- Homepage: `https://mergeearn-saidur-droids-projects.vercel.app`
- Callback: `https://mergeearn-saidur-droids-projects.vercel.app/api/auth/github/callback`

The script then stores the Client ID and Client Secret in Vercel Production. Never paste the secret into chat.

### Nimiq

RPC currently targeted by release automation:

`https://rpc.nimiqwatch.com`

The local script already confirmed `getBlockNumber` responds.

The real E2E still requires an owner-controlled **public NQ address** for funding/payout configuration and explicit wallet approval/signature for actual funding and payout transactions.

Never request or store seed phrases, recovery words, login files, or private keys.

## Competition packaging

Canonical files already prepared:

- `docs/COMPETITION_SUBMISSION.md`
- `docs/SUBMISSION_FORM.md`
- `docs/PROMOTION_COPY.md`
- `docs/DEMO_RUNBOOK.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/SECURITY_RELEASE_CHECKLIST.md`
- `SECURITY.md`
- `CONTRIBUTING.md`

Repository-public and MIT-license gates are **already complete**. Do not ask the owner for those approvals again unless the repository state changes.

## Immediate execution order from this handoff

1. Resolve the local Vercel account/team mismatch described above.
2. Rerun `finish-mergeearn.ps1` from `C:\Users\win10\MergeEarn`.
3. Let the script verify/configure production env variables and deploy current `main`.
4. Verify production URL, `/api/auth/session`, GitHub OAuth redirect, Supabase connectivity and Nimiq RPC.
5. Fix any real runtime/deploy mismatch found by those checks.
6. Run the smallest-practical real E2E:
   `Issue -> Fund -> Claim -> PR -> Merge -> Verify -> Approve -> Pay`.
7. Stop only for GitHub/Vercel login/2FA/CAPTCHA or Nimiq wallet unlock/signature.
8. Verify final `PAID` state, persistent payment/audit records and clean runtime logs.
9. Capture screenshots/video, publish required promotion posts, replace submission placeholders and complete the competition submission.

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
- MIT license is present;
- repository is public;
- competition submission is completed with working URLs.

Until those final operational gates pass, report the real status rather than claiming 100%.
