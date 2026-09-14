# MergeEarn — Next Session Handoff

> Persistent handoff for humans and AI agents. If a future session starts with only the repository URL, read this file before asking the user to repeat the product context.

## Resume rule

If the user gives `https://github.com/Saidur-droid/MergeEarn` (or `Saidur-droid/MergeEarn`) and asks to continue/finish:

1. Read `AGENTS.md`.
2. Read `PROJECT_PLAN.md`.
3. Read `ARCHITECTURE.md`.
4. Read `ROADMAP.md`.
5. Read `docs/DECISIONS.md`.
6. Read this file.
7. Inspect GitHub Issue #1, current `main`, open PRs, and latest CI.
8. Continue the highest-priority incomplete release gate directly; do not ask the user to explain MergeEarn again.

## Product identity

**Name:** MergeEarn  
**Type:** responsive SaaS web app designed to work as a Nimiq Mini App/WebView experience. It is not a native Android/iOS competition app.  
**One-line pitch:** Turn GitHub issues into paid, verified work.

Core user loop:

`Issue -> Bounty -> Fund -> Fix -> Pull Request -> Verify -> Merge -> Approve -> Pay`

Product boundaries remain locked:

- GitHub-first, not a generic freelancer marketplace.
- GitHub canonical state is code-work truth.
- Nimiq is the competition payment rail behind a provider-neutral domain boundary.
- AI is advisory and never payment authority.
- Important lifecycle changes use the explicit bounty state machine.
- Never show fake `FUNDED` or `PAID` states.

## Current engineering status — 2026-09-14

The original foundation was approximately 60%. The remaining P0 **code-level production vertical slice has now been implemented in PR #3** (`feature/production-vertical-slice`).

Do **not** call the overall competition release 100% complete until the operational release gates below are configured and a real deployed end-to-end transaction succeeds.

### Implemented in the production vertical slice

#### Trusted backend and persistence

- Vercel-compatible `/api/*` trusted server layer.
- Supabase/PostgreSQL migration at `supabase/migrations/202609140001_core.sql`.
- Persistent users, encrypted sessions, GitHub repositories, source issues, bounties, claims, submissions, payment transactions, and audit events.
- RLS enabled with no anonymous browser policies; browser never receives the Supabase service-role key.
- Database trigger/function rejects invalid bounty transitions.
- Money-sensitive transitions are audit logged.
- Unique payment idempotency keys and one-confirmed-payout-per-bounty protection.

#### GitHub authentication and authorization

- GitHub OAuth start/callback/session/logout flow.
- OAuth state validation.
- GitHub access token encrypted at rest with AES-256-GCM; only a hash of the browser session token is stored.
- Least-privilege competition scope for public repositories (`read:user public_repo`).
- Authorized public repository picker.
- Server-side maintainer/push permission enforcement.
- Canonical repository and issue IDs persisted.
- Canonical PR repository/base-branch/head-SHA/merge-state verification on the trusted server.

#### AI bounty copilot

- Issue -> structured editable bounty draft.
- Title, summary, acceptance criteria, difficulty, effort guidance, suggested reward range, and ambiguity/risk flags.
- Output validation.
- Safe structured fallback when no AI provider is configured or AI fails.
- AI output remains editable and never determines payment eligibility.

#### Contributor workflow

- Funded bounty board/detail experience.
- Authenticated contributor claim.
- Contributor Nimiq payout address capture.
- Single active claim protection.
- PR submission linked to the active claimant.
- Canonical GitHub validation before `PR_SUBMITTED`/`VERIFIED`.

#### Nimiq funding and payout

- Official `@nimiq/mini-app-sdk` wallet connection and transaction request path retained.
- Funding transaction is recorded as pending, then verified through server-side Nimiq JSON-RPC before `FUNDED`.
- Funding verification checks recipient, amount, execution result, and block confirmation.
- Maintainer approval is required after verified merge.
- Payout uses one idempotency key per bounty.
- Payout wallet signs through Nimiq Pay; MergeEarn does not store a private key/seed.
- Server verifies payout sender, recipient, amount, and confirmation before `PAID`.
- Failed payout can be retried without permitting a duplicate confirmed payout.

#### Metrics and UX

- Responsive maintainer/contributor production UI.
- GitHub sign-in landing, repository/issue picker, bounty builder, live bounty board, claim/PR/approval/payment actions.
- Loading, empty, failed, pending, retry, and success states.
- Compact metrics for created/funded/claimed/PR submitted/verified/paid/completion/contributors/value/timing.
- Security headers in `vercel.json`.
- Production environment contract in `.env.example`.
- Production setup/security documentation in `README.md`.

#### Quality

- Existing bounty state-machine tests remain.
- New PR trust-boundary/payment retry policy tests added.
- GitHub Actions PR verification runs:
  - typecheck
  - tests
  - production build
- PR #3 CI reached green during implementation. Always inspect the latest head CI again before merging/deploying.

## Remaining release gates — these are why the project is not yet honestly 100%

The remaining blockers require external account configuration or real-world execution rather than more mock UI work.

### 1. Dedicated Supabase production project

A dedicated MergeEarn database project still needs to be created/selected and the migration applied.

Known connected Supabase organization from this session: `yjqwythragekbcbmbzmz`.

**Important:** Before creating a Supabase project, explicitly ask the user which organization to use and confirm the reported cost. Do not silently reuse another app's database.

Then configure:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- apply `supabase/migrations/202609140001_core.sql`
- run Supabase security/performance advisors after migration

### 2. GitHub OAuth App credentials

A real OAuth App must be created/configured with callback:

`<APP_URL>/api/auth/github/callback`

Then configure:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SESSION_ENCRYPTION_KEY` (long random secret)

Never paste these into repository source code.

### 3. Nimiq production configuration

Configure and verify:

- `VITE_NIMIQ_FUNDING_ADDRESS`
- `NIMIQ_FUNDING_ADDRESS` (must match the browser public funding recipient)
- `NIMIQ_PAYOUT_SOURCE_ADDRESS`
- `NIMIQ_RPC_URL`

Then test one real funding transaction and one real payout transaction. The production RPC response shape/method must be validated against the configured Nimiq endpoint before submission.

### 4. Vercel project/deployment

Connected Vercel team discovered in this session:

- team: `saidur-droid's projects`
- team id: `team_BsJXXtOBNmww7MhlgiE7JzzO`

No dedicated MergeEarn Vercel project existed when checked. Create/link the project to `Saidur-droid/MergeEarn`, configure all server/browser environment variables securely, deploy, and inspect build/runtime logs.

### 5. Real end-to-end release validation

On the deployed production URL, perform this exact path with a test repository/issue/PR:

1. Sign in with GitHub.
2. Choose an authorized public repository.
3. Choose a real issue.
4. Generate/review/edit bounty specification.
5. Create/publish bounty.
6. Fund through Nimiq.
7. Confirm server independently moves it to `FUNDED` only after chain verification.
8. Sign in as/with a contributor and claim the bounty.
9. Link a real PR against the expected default branch.
10. Merge the PR.
11. Re-verify canonical GitHub state until `VERIFIED`.
12. Authorized maintainer approves it.
13. Configured payout wallet sends payout.
14. Server verifies payout before `PAID`.
15. Confirm transaction/audit records and metrics.
16. Test mobile/WebView layout and runtime errors.

### 6. Competition packaging

Still needed after the deployed path works:

- repository visibility changed to public if competition rules require it
- screenshots
- 60–90 second demo recording
- submission description
- small real-user pilot
- final accessibility/performance/WebView QA

## Next execution order

When resuming, do this sequence unless repository state proves a step is already finished:

1. Inspect latest PR #3/main CI and merge production code if green.
2. Create/configure the dedicated Supabase project (after user organization/cost confirmation).
3. Apply migration and run Supabase security/performance advisors.
4. Configure GitHub OAuth credentials and `SESSION_ENCRYPTION_KEY`.
5. Create/link MergeEarn Vercel project and add environment variables.
6. Configure Nimiq funding/payout public addresses and trusted RPC.
7. Deploy.
8. Inspect Vercel build/runtime errors.
9. Run the real Issue -> Fund -> Claim -> PR -> Merge -> Approve -> Pay path.
10. Fix any integration mismatch found by the real transaction test.
11. Only after that mark Issue #1 complete and report 100%.

## Definition of 100%

Only call MergeEarn **100% competition-ready** when a real person can complete the deployed path above and:

- GitHub permissions are enforced server-side.
- funding is independently confirmed before `FUNDED`.
- repository/base branch/merge state is independently verified.
- maintainer approval is recorded.
- payout is idempotent.
- provider confirmation is verified before `PAID`.
- payment/audit records are persistent.
- latest CI is green.
- deployed app is reachable, visually verified, and has no blocking runtime errors.

If any of these are missing, report the real status instead of claiming 100%.
