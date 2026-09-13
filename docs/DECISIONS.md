# MergeEarn Decision Log

This file records decisions that should not be repeatedly re-litigated by humans or AI agents unless new evidence requires a change.

## D-001: GitHub-first product

**Decision:** MergeEarn remains GitHub-first.

The competition product is not a general freelance marketplace. Its core is:

**GitHub Issue -> Bounty -> Pull Request -> Verified Merge -> Payment**

Why:
- objective completion signal
- narrow, understandable workflow
- repeatable maintainer use case
- strong integration story
- feasible competition scope

## D-002: Simple outside, rigorous inside

**Decision:** The UI uses plain language and hides infrastructure complexity.

User mental model:

**Fund issue -> developer fixes -> merge -> pay**

Internal implementation may contain state machines, audit events, webhooks, payment references, provider adapters, and AI metadata.

## D-003: GitHub is source of truth for code-work state

**Decision:** MergeEarn does not accept a contributor's self-declared completion as sufficient proof.

Canonical GitHub state should verify repository, issue, pull request, target branch, merge state, and where useful CI/check state.

## D-004: Nimiq is first payment provider, not domain architecture

**Decision:** Competition flow uses Nimiq Pay meaningfully for funding/payout, while domain logic depends on a provider-neutral payment interface.

Why:
- competition fit now
- future multi-payment flexibility
- prevents payment SDK details from infecting bounty logic

## D-005: AI is copilot, not payment authority

**Decision:** AI can structure issues, suggest acceptance criteria/reward ranges, summarize PRs, and flag risk. AI alone cannot release money or assert GitHub facts.

Why:
- hallucination risk
- irreversible payment safety
- clearer auditability

## D-006: Explicit bounty state machine

**Decision:** Critical lifecycle state is represented by validated states/transitions, not independent booleans.

Primary path:

`DRAFT -> READY_TO_FUND -> FUNDED -> CLAIMED -> PR_SUBMITTED -> VERIFIED -> APPROVED -> PAID`

## D-007: Competition scope beats speculative breadth

**Decision:** Build one complete real workflow before private repos, multi-chain support, enterprise billing, generalized marketplace features, or AI-agent work networks.

## D-008: Human + AI shared source of truth

**Decision:** `README.md`, `AGENTS.md`, `PROJECT_PLAN.md`, `ARCHITECTURE.md`, `ROADMAP.md`, and this file govern implementation context.

Any PR that changes a locked behavior must update the appropriate documentation in the same PR.

## How to change a decision

Add a new entry containing:
- old decision reference
- new evidence/problem
- replacement decision
- migration impact

Do not silently rewrite historical decisions without explaining why.
