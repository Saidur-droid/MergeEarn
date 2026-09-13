# MergeEarn Roadmap

## Execution rule

Do not parallelize core dependencies blindly. Build in this order so every stage produces something testable.

## Phase 0 - Foundation

- [x] Initialize repository
- [x] Add human + AI operating guide
- [x] Add product plan
- [x] Add architecture
- [ ] Add decision log
- [ ] Add app scaffold
- [ ] Add lint/typecheck/test baseline
- [ ] Add environment template

Exit condition: any human or AI agent can open the repo and understand what to build and how changes are governed.

## Phase 1 - Product shell

- [ ] Mobile-first navigation
- [ ] Landing/home screen
- [ ] GitHub connect entry point
- [ ] Maintainer vs contributor task paths
- [ ] Shared design tokens/components
- [ ] Error/loading/empty states

Exit condition: the entire product flow is visible as a clickable shell without fake payment success.

## Phase 2 - GitHub foundation

- [ ] GitHub authentication/GitHub App strategy implemented
- [ ] Authorized repositories list
- [ ] Issues list per repository
- [ ] Canonical issue import
- [ ] Repository permission verification
- [ ] PR lookup/association
- [ ] Webhook signature verification
- [ ] Idempotent GitHub event ingestion

Exit condition: MergeEarn can reliably resolve a real repository, issue, PR, and merged state.

## Phase 3 - Bounty domain

- [ ] Database schema/migrations
- [ ] Bounty creation
- [ ] Explicit bounty state machine
- [ ] Reward model
- [ ] Claim/start-work flow
- [ ] Submission model
- [ ] Audit event model
- [ ] State transition unit tests

Exit condition: core bounty lifecycle works without payment provider coupling.

## Phase 4 - AI Bounty Copilot

- [ ] Issue -> structured bounty draft
- [ ] Editable acceptance criteria
- [ ] Difficulty guidance
- [ ] Reward range suggestion
- [ ] AI output schema validation
- [ ] AI failure fallback to manual creation
- [ ] Audit metadata for AI-assisted content

Exit condition: a messy issue can become a clear editable bounty in seconds, but humans retain control.

## Phase 5 - Nimiq funding

- [ ] Payment provider interface
- [ ] Nimiq provider implementation
- [ ] Funding intent/UI
- [ ] Funding verification
- [ ] Funding transaction record
- [ ] Pending/failed/success UI
- [ ] Idempotency tests

Exit condition: a real bounty can move from `READY_TO_FUND` to `FUNDED` only after verified Nimiq funding.

## Phase 6 - Contributor workflow

- [ ] Funded bounty discovery/detail
- [ ] Start/claim work
- [ ] Contributor instructions
- [ ] Link/submit PR
- [ ] Server-side PR validation
- [ ] Progress/status UI

Exit condition: contributor can go from finding a bounty to a valid PR submission without maintainer handholding.

## Phase 7 - Verification and payout

- [ ] Detect merged PR from GitHub canonical state
- [ ] Validate expected repo/base branch
- [ ] Show CI/check status where available
- [ ] Maintainer approval safeguard
- [ ] Nimiq payout implementation
- [ ] Provider-confirmed `PAID` state
- [ ] Retry-safe payout failure handling
- [ ] Duplicate payout prevention tests

Exit condition: one complete Issue -> Fund -> Fix -> PR -> Merge -> Pay loop works with real integrations.

## Phase 8 - Metrics and trust

- [ ] Event telemetry
- [ ] Dashboard counters
- [ ] Time-to-claim / time-to-merge / time-to-pay metrics
- [ ] Repeat maintainer/contributor metric
- [ ] Transaction history
- [ ] Basic contributor reliability signals

Exit condition: judges and team can see concrete evidence of usage and workflow quality.

## Phase 9 - Competition polish

- [ ] Mobile WebView QA
- [ ] Empty/error/retry states
- [ ] Accessibility pass
- [ ] Performance pass
- [ ] README screenshots
- [ ] 60-90 second demo path
- [ ] Submission description
- [ ] Real-user pilot
- [ ] Fix top pilot friction

Exit condition: finished usable product, not a mockup.

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

## Priority filter

For every proposed feature ask:

1. Does it improve the core Issue -> Pay loop?
2. Does it improve originality, repeat value, Nimiq integration, real usage, or UX?
3. Can users understand it immediately?
4. Can we test it reliably?

If mostly no, defer it.
