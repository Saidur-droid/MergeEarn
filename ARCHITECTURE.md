# MergeEarn Architecture

## Goal

Keep the user experience simple while making GitHub verification, payments, and auditability reliable.

## High-level system

```text
Nimiq Mini App / Web UI
        |
        v
Application API
        |
        +--> GitHub Integration
        |      - OAuth/GitHub App auth
        |      - repositories
        |      - issues
        |      - pull requests
        |      - webhooks
        |
        +--> MergeEarn Domain
        |      - bounties
        |      - claims
        |      - submissions
        |      - verification
        |      - approvals
        |      - state machine
        |
        +--> AI Service
        |      - issue -> bounty draft
        |      - acceptance criteria
        |      - difficulty/reward guidance
        |      - PR summary/risk flags
        |
        +--> Payment Service
        |      - provider abstraction
        |      - Nimiq provider
        |      - funding verification
        |      - payout
        |
        +--> Persistence
               - users
               - github installations/repos/issues
               - bounties
               - claims
               - submissions
               - payment transactions
               - audit events
               - metrics events
```

## Recommended implementation stack

The exact framework may change if the official Nimiq Mini Apps starter requires it, but domain boundaries should remain stable.

- TypeScript
- React-based Mini App UI
- server/API layer for trusted GitHub/payment verification
- PostgreSQL-compatible database
- schema validation at API/provider boundaries
- unit tests for domain state and payment rules
- integration tests for GitHub/payment adapters where feasible

## Domain entities

### User
- `id`
- `githubUserId`
- `githubLogin`
- profile metadata
- timestamps

### Repository
- `id`
- `githubRepositoryId`
- `owner`
- `name`
- `defaultBranch`
- permissions snapshot
- timestamps

### SourceIssue
- `id`
- `githubIssueId`
- `repositoryId`
- `number`
- `title`
- minimal normalized metadata
- source URL
- timestamps

### Bounty
- `id`
- `repositoryId`
- `sourceIssueId`
- `creatorUserId`
- `title`
- `description`
- `acceptanceCriteria`
- `rewardAmount`
- `rewardAsset`
- `status`
- `expiresAt`
- timestamps

### Claim
- `id`
- `bountyId`
- `contributorUserId`
- `status`
- timestamps

### Submission
- `id`
- `bountyId`
- `claimId`
- `githubPullRequestId`
- `pullRequestNumber`
- `headSha`
- `baseBranch`
- `verificationStatus`
- timestamps

### PaymentTransaction
- `id`
- `bountyId`
- `type` (`FUNDING` or `PAYOUT`)
- `provider`
- `asset`
- `amount`
- `providerReference`
- `idempotencyKey`
- `status`
- timestamps

### AuditEvent
- `id`
- `bountyId`
- `actorType`
- `actorId`
- `eventType`
- `metadata`
- timestamp

## Bounty state machine

```text
DRAFT
  -> READY_TO_FUND
  -> FUNDED
  -> CLAIMED
  -> PR_SUBMITTED
  -> VERIFIED
  -> APPROVED
  -> PAID
```

Exception/terminal states:

```text
CANCELLED
EXPIRED
DISPUTED
PAYMENT_FAILED
```

### Important invariants

- `FUNDED` requires verified funding.
- `CLAIMED` requires `FUNDED`.
- `PR_SUBMITTED` requires an active valid claim and GitHub-resolved PR.
- `VERIFIED` requires objective GitHub evidence.
- `APPROVED` requires maintainer authorization/policy.
- `PAID` requires provider-confirmed payout.
- a bounty can have at most one successful payout.

## GitHub integration

Prefer a GitHub App for repository-level permissions and webhook support.

Minimum capabilities:
- identify user
- list authorized repositories
- read issues
- read PR metadata
- detect merged PRs
- read check/CI state where permission allows
- receive relevant webhook events

Never trust browser-provided repository permissions without server verification.

### Relevant webhook classes

Potential events:
- issues
- pull_request
- pull_request_review
- check_suite/check_run or workflow-related signals if required
- installation / installation_repositories

Webhook processing rules:
- validate signature
- persist provider event ID
- ignore/replay safely if event already processed
- fetch canonical GitHub state when money-affecting decisions depend on it

## AI architecture

AI produces structured suggestions, not source-of-truth facts.

Recommended output shape for issue-to-bounty:

```ts
type BountyDraft = {
  title: string;
  summary: string;
  acceptanceCriteria: string[];
  difficulty: "easy" | "medium" | "hard";
  estimatedEffort?: string;
  suggestedReward?: {
    min: number;
    max: number;
    asset: string;
  };
  risks: string[];
};
```

Every generated draft remains editable before publish/funding.

Do not send secrets, private repository content, or unnecessary code to an external model without explicit product/privacy policy support.

## Payment architecture

Domain code depends on a provider-neutral interface.

```ts
type FundingInput = {
  bountyId: string;
  amount: string;
  asset: string;
};

type PayoutInput = {
  bountyId: string;
  recipient: string;
  amount: string;
  asset: string;
  idempotencyKey: string;
};

interface PaymentProvider {
  createFundingIntent(input: FundingInput): Promise<unknown>;
  verifyFunding(reference: string): Promise<unknown>;
  releasePayout(input: PayoutInput): Promise<unknown>;
  getTransaction(reference: string): Promise<unknown>;
}
```

### Competition provider

`NimiqPaymentProvider`

Nimiq is integrated deeply enough that a real bounty can be funded and a real payout can be completed through the competition flow.

### Future providers

Possible adapters later:
- stablecoin rails
- card/fiat provider
- organization balance
- other supported payment networks

Adding one must not change the bounty state machine.

## Authorization

Server-side policies should distinguish:
- public visitor
- authenticated contributor
- repository maintainer/admin
- bounty creator
- platform service

Examples:
- only an authorized maintainer can create/fund a bounty for a managed repository
- only the active claimant can attach a submission under a single-claim policy
- only authorized maintainer/policy can approve payout

## Observability

Important events should generate structured telemetry:
- bounty.created
- bounty.funded
- bounty.claimed
- submission.pr_linked
- submission.verified
- bounty.approved
- payout.started
- payout.confirmed
- payout.failed

Track latency between these events for competition metrics and product learning.

## Failure strategy

Failures must be visible and recoverable.

Examples:
- GitHub unavailable -> retain current state, retry verification
- funding pending -> do not mark funded
- webhook duplicate -> no duplicate transition
- payout timeout -> query provider before retry
- payout failed -> `PAYMENT_FAILED`, allow safe retry
- PR closed without merge -> remain unresolved/return to allowed workflow state

## Deployment principle

Keep competition deployment simple. Avoid infrastructure that does not directly improve reliability, user experience, or scoring.

Production boundaries should be real; production-scale complexity can wait.
