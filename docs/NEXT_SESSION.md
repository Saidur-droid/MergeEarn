# MergeEarn — Next Session Handoff

> Purpose: this file is the persistent handoff for humans and AI agents. If a future session starts with only the repository URL, read this file before asking the user to restate context.

## Resume rule

If the user gives only `https://github.com/Saidur-droid/MergeEarn` (or `Saidur-droid/MergeEarn`) and asks to continue, **do not ask them to explain the product again**.

Read, in order:

1. `AGENTS.md`
2. `PROJECT_PLAN.md`
3. `ARCHITECTURE.md`
4. `ROADMAP.md`
5. `docs/DECISIONS.md`
6. **this file**
7. GitHub Issue #1
8. inspect current `main` branch and latest CI before writing code

Then continue the remaining P0 work directly.

## Product identity

**Name:** MergeEarn  
**Type:** responsive SaaS web app, designed to also work as a Nimiq Mini App/WebView experience. It is not a native Android/iOS app for the competition MVP.

**One-line pitch:** Turn GitHub issues into paid, verified work.

**User-facing loop:**

`Issue -> Bounty -> Fund -> Fix -> Pull Request -> Verify -> Merge -> Pay`

Keep the UI simple enough for a first-time non-crypto user. Do not turn the product into Fiverr/Upwork or a generic crypto dashboard.

## Competition intent

Build a polished, real, competition-ready MVP for the Nimiq Mini Apps competition. The objective is a coherent real workflow, not a static prototype.

Nimiq is the first payment rail. Keep the payment domain provider-neutral so other rails can be added later without rewriting bounty logic.

## Current completion estimate

**Approximately 60% of the competition-ready MVP is complete.**

Do not call it 100% until the Definition of Done at the bottom of this file is satisfied.

## What is already implemented on `main`

### Product / repository foundation

- Human + AI operating rules in `AGENTS.md`
- Product plan, architecture, roadmap, and locked decisions
- React + TypeScript + Vite application foundation
- Mobile-first responsive UI
- Explicit bounty status/state-machine module
- State transition tests
- Provider-neutral payment interface/types
- GitHub Actions CI with typecheck, tests, and production build
- Foundation PR #2 was merged into `main`

### GitHub flow implemented

- Parse and import a real public GitHub issue URL
- Read live issue metadata from GitHub API
- Reject pull-request URLs when an issue is required
- Build an editable bounty draft from the imported issue
- Parse and resolve a real public pull request URL
- Verify that a PR belongs to the bounty repository
- Read canonical GitHub PR metadata including merged state, base branch, head SHA, author, and merged timestamp
- Show verified/not-merged PR state in UI

### Bounty workspace implemented

- Editable title
- Editable summary
- Editable acceptance criteria
- Reward amount
- Asset selector
- Local workspace persistence in browser storage
- Reset flow
- Loading, empty, error, pending, and verification UI states

### Nimiq implemented

- Official `@nimiq/mini-app-sdk` dependency
- Nimiq Pay account connection
- Consensus/block information retrieval
- NIM-to-Luna conversion with validation
- Real `sendBasicTransaction()` funding request path
- SDK error-response handling
- Funding address is environment-configured and is intentionally not hard-coded
- A submitted transaction is NOT treated as `FUNDED` automatically

### Quality status

- Latest foundation CI reached green: typecheck, tests, and production build passed before merge
- No secrets should be committed

## Important current limitations

The current application is still not the finished production P0 flow.

- No production GitHub OAuth/GitHub App authentication yet
- No authenticated repository picker / permission enforcement yet
- Public URL import exists, but trusted server-side GitHub verification is still required
- No production database persistence yet
- No audit-event persistence yet
- No real AI issue-to-bounty copilot yet
- No contributor claim lifecycle yet
- No backend Nimiq funding confirmation yet
- No maintainer approval service yet
- No idempotent payout implementation yet
- No provider-confirmed `PAID` transition yet
- No full integration/E2E happy-path test yet
- Final production deployment and public competition-ready URL still need to be finalized and verified
- Repository is currently private; it must be made public before competition submission if the competition rules require a public repository

## Next-session execution order

Work through these in order unless current repository state proves one has already been completed.

### P0.1 — Trusted backend + persistence

1. Add a trusted server/API layer suitable for Vercel deployment.
2. Add production persistence for:
   - users
   - GitHub repositories/installations
   - source issues
   - bounties
   - claims
   - submissions
   - payment transactions
   - audit events
3. Enforce server-side bounty transition validation.
4. Persist all money-affecting transitions and idempotency keys.
5. Keep secrets server-only.

Preferred direction from the existing architecture: PostgreSQL-compatible persistence; Supabase is acceptable if implemented with strict RLS/security practices and current official docs.

### P0.2 — GitHub authentication / repository authorization

1. Implement GitHub OAuth or GitHub App integration using the least privileges needed.
2. Identify the signed-in GitHub user.
3. List repositories the user is authorized to manage.
4. Verify maintainer/admin permission server-side.
5. List/select issues from the chosen repository.
6. Persist canonical GitHub IDs, not only URLs.
7. Move money-affecting GitHub verification to the trusted server layer.

Do not trust browser-provided permissions or contributor claims.

### P0.3 — AI Bounty Copilot

Create structured, editable output from issue content:

- title
- concise summary
- acceptance criteria
- difficulty
- effort guidance if useful
- suggested reward range
- risks / ambiguity flags

Requirements:

- validate output schema
- allow manual editing
- provide manual fallback if AI fails
- AI never decides payment eligibility

### P0.4 — Contributor claim + submission lifecycle

1. Funded bounty can be claimed by an authenticated contributor.
2. Persist active claim.
3. Contributor links a PR.
4. Server resolves canonical PR state.
5. Verify expected repository and base branch.
6. Verify merge status.
7. Move bounty through explicit states only.

### P0.5 — Nimiq funding verification

1. Keep official Mini App SDK interaction for wallet approval.
2. Record funding intent / transaction reference.
3. Verify transaction canonically on the trusted side before `FUNDED`.
4. Store payment transaction + audit event.
5. Handle pending/failed/retry states safely.

### P0.6 — Approval + payout

1. Only an authorized maintainer/policy path can approve a verified bounty.
2. Create payout with a unique idempotency key.
3. Safe retry must never produce duplicate successful payouts.
4. Do not mark bounty `PAID` until provider confirmation is verified.
5. Persist all payout attempts and audit events.

### P0.7 — Metrics / judge-visible proof

At minimum expose or calculate:

- bounties created
- funded
- claimed
- PR submitted
- verified/merged
- paid
- completion rate
- total bounty value
- total paid
- active contributors
- repeat contributors where data exists
- median completion time where data exists

Keep this compact. Do not build a large analytics product before the core loop is finished.

### P0.8 — Tests and security

Add tests for:

- server-side invalid state transitions
- GitHub repository/PR/base-branch relationship
- funding verification
- payout eligibility
- duplicate payout/idempotency
- authorization boundaries
- at least one adapter-backed integration happy path

Security requirements:

- verify GitHub/webhook signatures when webhooks are introduced
- idempotent webhook processing
- least-privilege GitHub scopes
- no private keys or secrets in browser code
- no client-only authorization for maintainer actions

### P0.9 — Final UX + deployment

1. Finish maintainer journey.
2. Finish contributor journey.
3. Ensure mobile layout is strong.
4. Make crypto complexity invisible in normal UI.
5. Deploy the current `main` to Vercel.
6. Configure required environment variables securely.
7. Visually verify the deployed app and inspect runtime/build errors.
8. Run a real end-to-end demo with a test repository/issue/PR.
9. Prepare README/demo instructions and competition submission material.
10. Make the GitHub repository public when submission rules require it.

## External credentials / configuration that may become necessary

Do not block early engineering on these. Continue everything possible first. Ask the user only when a credential is truly required and cannot be created/connected through available tools.

Potential requirements:

- GitHub OAuth App or GitHub App credentials/configuration
- database project/configuration
- AI provider/server configuration if needed
- Nimiq funding/payout address or account configuration
- Vercel environment variables/domain settings

Never ask the user to paste private keys into source code or chat if a secure connector/environment-secret workflow is available.

## Product rules that must not drift

- GitHub-first; not a generic freelancer marketplace
- objective GitHub verification is the code-work truth source
- AI is advisory, not payment authority
- explicit state machine for money-sensitive lifecycle
- Nimiq is the competition rail, behind a payment abstraction
- no fake `FUNDED` or `PAID` UI states
- no payout from an invalid state
- one coherent loop before feature breadth
- simple UX, serious backend

## Definition of 100% for the competition-ready MVP

Only call the product **100% complete** when a real person can perform this coherent path on the deployed app:

1. Sign in with GitHub.
2. Choose an authorized repository.
3. Choose a real issue.
4. Generate/review a clear bounty spec.
5. Fund it through Nimiq.
6. Funding is independently verified before `FUNDED`.
7. A contributor claims the bounty.
8. The contributor links a real PR.
9. MergeEarn verifies repository, branch, and merged state from GitHub.
10. Authorized maintainer approval is recorded.
11. Payout is created idempotently.
12. Provider confirmation is verified before `PAID`.
13. Transactions/audit events are persisted.
14. Core tests pass.
15. The production deployment is reachable and visually verified.

If any of these is missing, report the real percentage/status instead of claiming 100%.

## How to respond when the user returns

If the user simply posts the MergeEarn repo URL and says something like "continue", "finish it", or "work":

- do not ask them to repeat the product idea
- inspect `main`, CI, Issue #1, and this file
- state the current percentage briefly
- continue coding the highest-priority incomplete item
- keep the user updated during long work
- stop only for a genuine credential/permission blocker or after completing the requested work
