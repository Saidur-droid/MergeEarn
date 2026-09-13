# AGENTS.md

This file is the operating guide for **both human contributors and AI coding agents** working on MergeEarn.

## 1. Read-first order

Before changing code, read these files in order:

1. `README.md`
2. `PROJECT_PLAN.md`
3. `ARCHITECTURE.md`
4. `ROADMAP.md`
5. `docs/DECISIONS.md`
6. `docs/NEXT_SESSION.md`

`docs/NEXT_SESSION.md` is the persistent execution handoff. If a future session begins with only the MergeEarn repository URL, do **not** ask the user to restate the product context. Read that handoff, inspect current `main`, CI, and P0 Issue #1, then continue the highest-priority incomplete work.

If a task conflicts with these documents, do not silently improvise. Explain the conflict and update the relevant source-of-truth document in the same pull request.

## 2. Product sentence

**MergeEarn turns GitHub issues into funded, verifiable work: a maintainer funds an issue, a contributor fixes it through a pull request, MergeEarn verifies the result, and the contributor gets paid.**

## 3. Non-negotiable user experience

The user-facing mental model is:

**Issue -> Fund -> Fix -> Pull Request -> Merge -> Pay**

Do not expose blockchain complexity unless technically required.

Prefer:
- `Fund bounty`
- `Payment ready`
- `Paid`

Avoid in normal UI:
- gas
- contract jargon
- chain internals
- raw wallet addresses
- protocol implementation details

A first-time user should understand what to do without reading documentation.

## 4. Product boundaries

### Competition MVP must include
- GitHub authentication/integration
- Repository selection
- Issue selection
- Turn an issue into a bounty
- Reward amount
- Nimiq Pay funding flow
- Contributor claim/intent-to-work flow
- Pull request association
- Verification of merged PR
- Explicit maintainer approval/payment release safeguard
- Transaction record
- Basic dashboard/metrics
- AI assistance for issue structuring and acceptance criteria

### Competition MVP must NOT become
- Fiverr/Upwork clone
- general freelancer marketplace
- generic crypto dashboard
- social network
- multi-chain playground
- full enterprise product

Build one excellent loop before breadth.

## 5. AI behavior rules

AI is advisory, not an unchecked authority.

AI may:
- rewrite messy issues into clear bounty specs
- propose acceptance criteria
- suggest difficulty/reward ranges
- summarize pull requests
- identify possible mismatch/risk

AI must NOT autonomously:
- release irreversible funds without an explicit verified policy path
- merge code
- override maintainer permissions
- invent GitHub state
- mark work complete without objective evidence

All AI output that affects payment must be auditable.

## 6. Objective verification rule

The strongest completion signal is an actual GitHub pull request linked to the bounty and merged into the expected repository/base branch.

Verification should combine:
1. GitHub identity
2. repository identity
3. issue identity
4. linked PR identity
5. merged state
6. optional checks/CI status
7. maintainer approval policy

Never trust a contributor-provided URL alone when GitHub API verification is available.

## 7. Payment abstraction rule

Competition implementation uses **Nimiq Pay** as the core payment rail.

Application domain logic must not be tightly coupled to one provider. Use a payment-provider interface so future rails can be added without rewriting bounty logic.

Conceptual contract:

```ts
interface PaymentProvider {
  createFundingIntent(input: FundingInput): Promise<FundingResult>
  verifyFunding(reference: string): Promise<FundingStatus>
  releasePayout(input: PayoutInput): Promise<PayoutResult>
  getTransaction(reference: string): Promise<TransactionStatus>
}
```

Nimiq is the first implementation, not the permanent business boundary.

## 8. State machine rule

Bounty status transitions must be explicit and validated. Never derive important payment behavior from loose booleans.

Expected high-level states:

`DRAFT -> READY_TO_FUND -> FUNDED -> CLAIMED -> PR_SUBMITTED -> VERIFIED -> APPROVED -> PAID`

Possible terminal/exception states:

`CANCELLED`, `EXPIRED`, `DISPUTED`, `PAYMENT_FAILED`

No payout can happen from an invalid state.

## 9. Security rules

- Never commit secrets.
- Never expose private keys.
- Never trust client-side claims for payment or GitHub verification.
- Verify webhook signatures.
- Make webhook handlers idempotent.
- Store external event IDs to prevent duplicate processing.
- Use least-privilege GitHub permissions.
- Validate repository/issue/PR ownership relationships server-side.
- Require server-side authorization for maintainer-only actions.
- Log payment-affecting transitions.

## 10. Data and privacy rules

Store only what is necessary for the product.

Prefer external IDs plus normalized metadata instead of copying entire GitHub objects.

For every important record, preserve:
- internal ID
- external provider ID
- creator/actor
- timestamps
- current state
- audit trail for payment-affecting transitions

## 11. Code quality rules

- TypeScript first.
- Small modules with explicit contracts.
- Domain logic separated from UI and provider SDKs.
- No duplicated state-transition rules.
- No hidden magic strings for statuses.
- Validate external input at boundaries.
- Add tests for state transitions and money-sensitive logic.
- Prefer boring, readable code over clever abstractions.

## 12. Pull request rules

Each PR should:
- solve one coherent problem
- explain user impact
- list important implementation choices
- include screenshots for UI changes
- include tests for domain/payment behavior
- update docs if product/architecture behavior changes

Use conventional-style titles where practical, for example:
- `feat: add bounty creation flow`
- `fix: prevent duplicate payout webhook`
- `docs: clarify verification policy`

## 13. Definition of done

A feature is not done because the UI exists.

It is done when:
- the happy path works
- failure states are handled
- permissions are enforced
- relevant events are persisted
- metrics can observe it
- tests cover critical logic
- docs match behavior

## 14. Decision principle

When choosing between two implementations, prefer the one that improves, in this order:

1. Correct payment behavior
2. Simple user experience
3. Verifiable GitHub workflow
4. Security
5. Competition usefulness/repeat value
6. Maintainability
7. Future extensibility
8. Visual polish

Do not sacrifice 1-6 for speculative future architecture.
