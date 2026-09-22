# MergeEarn Roadmap

## Execution rule

Build the core dependencies in order and report real status. Do not call the competition MVP 100% complete until the deployed real-user path has been exercised end-to-end.

## Phase 0 - Foundation

- [x] Initialize repository
- [x] Add human + AI operating guide
- [x] Add product plan
- [x] Add architecture
- [x] Add decision log
- [x] Add React/Vite app scaffold
- [x] Add typecheck/test/build baseline
- [x] Add production environment template
- [x] Add persistent next-session handoff

## Phase 1 - Product shell

- [x] Mobile-first product shell
- [x] Landing/home screen
- [x] GitHub connect entry point
- [x] Maintainer and contributor task paths
- [x] Shared UI system
- [x] Loading/error/empty/pending/retry states

## Phase 2 - GitHub foundation

- [x] GitHub OAuth authentication
- [x] Authorized public repositories list
- [x] Issues list per repository
- [x] Canonical issue persistence
- [x] Server-side repository permission verification
- [x] PR lookup/association
- [x] Canonical PR repository/base-branch/merge verification
- [ ] Webhook signature verification
- [ ] Idempotent GitHub webhook ingestion

Webhook ingestion is deferred until webhook credentials/configuration are introduced; the P0 flow performs canonical GitHub reads at money-sensitive checkpoints instead of trusting browser state.

## Phase 3 - Bounty domain

- [x] Database schema/migration
- [x] Bounty creation
- [x] Explicit bounty state machine
- [x] PostgreSQL transition enforcement
- [x] Reward model
- [x] Claim/start-work flow
- [x] Submission model
- [x] Audit event model
- [x] State transition tests

## Phase 4 - AI Bounty Copilot

- [x] Issue -> structured bounty draft
- [x] Editable acceptance criteria
- [x] Difficulty guidance
- [x] Reward range suggestion
- [x] AI output schema validation
- [x] Safe structured fallback when AI is unavailable
- [x] Audit metadata for AI-assisted content

## Phase 5 - Nimiq funding

- [x] Payment provider domain interface
- [x] Official Nimiq Mini App SDK integration
- [x] Funding request UI
- [x] Trusted-side Nimiq transaction verification path
- [x] Funding transaction record
- [x] Pending/failed/retry/success handling
- [x] Retry/idempotency policy coverage
- [x] Verify against configured production Nimiq RPC and real funding transaction

## Phase 6 - Contributor workflow

- [x] Funded bounty discovery/detail
- [x] Start/claim work
- [x] Contributor instructions
- [x] Link/submit PR
- [x] Server-side PR validation
- [x] Progress/status UI

## Phase 7 - Verification and payout

- [x] Detect merged PR from canonical GitHub state
- [x] Validate expected repository/base branch
- [x] Optional CI/check status display
- [x] Maintainer approval safeguard
- [x] Nimiq payout request implementation
- [x] Provider-confirmed `PAID` transition
- [x] Retry-safe payout failure handling
- [x] Duplicate payout prevention at database/application policy boundaries
- [x] Exercise a real payout from the configured payout wallet

## Phase 8 - Metrics and trust

- [x] Audit/event telemetry
- [x] Dashboard counters
- [x] Completion metrics
- [x] Repeat contributor metric
- [x] Payment transaction persistence
- [x] Dedicated transaction-history UI
- [x] Expanded contributor reliability signals

## Phase 9 - Competition polish

- [x] Responsive/mobile layout implementation
- [x] Empty/error/retry states
- [x] Security headers and server-only secret boundaries
- [x] Production setup/runbook in README
- [x] CI: typecheck + tests + production build
- [x] Deploy configured production environment
- [x] Mobile WebView visual QA on deployed URL
- [x] Accessibility pass on deployed URL
- [x] Performance pass on deployed URL
- [ ] README screenshots
- [x] 60-90 second demo recording
- [x] Submission description
- [ ] Real-user pilot
- [ ] Fix pilot friction
- [x] Make repository public if competition rules require it

## Current release gate

The production P0 vertical slice is deployed and has completed a real TESTNET `Issue -> Fund -> Claim -> PR -> Merge -> Approve -> Pay` lifecycle through `PAID`. During public judging, the remaining gates are operational hardening and evidence quality: keep production/CI healthy, rotate any credentials or recovery material exposed outside their secret stores, finish the final runtime-log review, and keep judge-facing proof and first-time UX reliable.

## After competition

Only after the core loop is stable:

- private repositories
- organization/team approvals
- multiple claims/competition modes
- more payment providers
- company billing
- public developer reputation graph
- API/SDK
- AI-agent task execution/verification
- dispute/mediation workflows
