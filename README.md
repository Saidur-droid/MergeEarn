# MergeEarn

> **Fund issues. Reward merges.**

MergeEarn turns GitHub issues into funded, verifiable bounties. Maintainers fund an issue, contributors solve it through a pull request, and the payout is released after the work is verified and merged.

## Core loop

**Issue -> Bounty -> Fund -> Fix -> Pull Request -> Verify -> Merge -> Pay**

## Product rule

The product must stay simple on the outside and rigorous on the inside.

- A new user should understand the main flow in under 30 seconds.
- GitHub merge status is the primary objective completion signal.
- Nimiq Pay is the competition payment rail and must be a meaningful part of the core flow.
- Payment code must be provider-agnostic so more rails can be added later.
- AI helps structure issues, acceptance criteria, review summaries, and risk signals; AI does not silently decide irreversible payments.

## For humans and AI coding agents

This repository uses explicit project documents as a shared source of truth. Before implementing a feature, read:

1. `AGENTS.md` - operating rules for humans and AI agents.
2. `PROJECT_PLAN.md` - product scope, priorities, user flows, and acceptance criteria.
3. `ARCHITECTURE.md` - technical boundaries, state model, and integration rules.
4. `ROADMAP.md` - ordered execution plan.
5. `docs/DECISIONS.md` - important architectural/product decisions and why they were made.

When documents and code disagree, do not guess. Update the relevant decision document in the same pull request or clearly flag the mismatch.

## Competition target

MergeEarn is being built first as a Nimiq Pay Mini App for the Nimiq Mini Apps Competition. The competition version will use the Nimiq Pay Mini Apps Framework and support a complete, real-user GitHub bounty flow rather than a prototype.

## Status

Foundation bootstrap in progress.
