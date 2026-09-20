# Cycle 2 Competitive Benchmark — Judging Phase

_Last updated: 2026-09-20._

## Purpose

This document is a strategic product benchmark, not an official competition ranking or a prediction of the judges' final results. It exists to keep MergeEarn focused on the published scoring rubric while learning from strong public submissions without copying their code, branding, content, or distinctive product expression.

## Published score weights

- 45 — Functionality, reliability, usefulness
- 25 — Nimiq Pay / Nimiq integration
- 15 — Real usage
- 10 — Design / UX
- 5 — Builder promotion

The repository must optimize honestly for these criteria. Never fabricate users, wallets, transactions, GitHub activity, testimonials, metrics, or traffic.

## Strategic benchmark group

### 1. Hunch
Why it is a strong benchmark:
- product idea is understandable quickly
- NIM is part of the core mechanic, not a decorative payment button
- uses real decisions and settlement rather than simulated balances
- strong story around objective behavior and trust

What MergeEarn should learn:
- make the core loop understandable within seconds
- make verification visible and intrinsic to the product story

### 2. Ralli
Why it is a strong benchmark:
- strong social invitation loop
- repeatable participation
- NIM boosts/tips sit underneath the social experience
- friend-to-friend sharing naturally creates acquisition

What MergeEarn should learn:
- every funded bounty should be easy to share directly with a developer
- the product should create invitations through real work, not ads

### 3. AskNim
Why it is a strong benchmark:
- zero-signup utility is immediately clear
- NIM micropayments map directly to the unit of value delivered
- simple, repeatable use case

What MergeEarn should learn:
- reduce first-use friction before authentication
- make public proof useful before asking for GitHub login

### 4. KashLink
Why it is a strong benchmark:
- one-sentence value proposition
- removes wallet-address friction from sending NIM
- naturally shareable

What MergeEarn should learn:
- bounty deep links need to be first-class acquisition objects
- sharing should work from mobile with minimal steps

### 5. Direct GitHub-bounty competitors
The showcase includes bounty/task products that attach NIM rewards to work. Their existence means MergeEarn cannot win on the phrase "GitHub bounties" alone.

MergeEarn differentiation must remain:
- GitHub is the canonical work source of truth
- Nimiq is the canonical money source of truth
- browser claims cannot create FUNDED or PAID state
- expected repository/base/merge are independently verified
- payout is independently verified
- public proof is visible without login

## MergeEarn judge thesis

**GitHub proves the work. Nimiq proves the money.**

A judge should be able to verify that claim without login by seeing:
1. a real GitHub issue,
2. a real bounty,
3. confirmed funding proof,
4. a real pull request,
5. merged/verified state,
6. confirmed payout proof,
7. live aggregate metrics.

## Current priority order

### P0 — Reliability
- keep main CI green
- keep Vercel production healthy
- keep public marketplace/API under automated smoke coverage
- fix any judge-facing dead end immediately

### P0 — Genuine usage
- attract genuine Nimiq Pay users organically
- encourage real community sponsorship of open MergeEarn issues
- complete fresh sponsor → contributor → PR → merge → payout lifecycles
- never simulate usage or buy traffic

### P1 — Shareability
- native Web Share support
- canonical public bounty deep links
- actionable funded work ranked prominently

### P1 — Public proof
- concise lifecycle progress
- GitHub issue/PR proof
- confirmed Nimiq funding/payout links
- live product metrics

### P2 — Polish
- mobile WebView QA
- accessibility
- performance
- concise copy
- strong empty/error/retry states

## Cost rule

Prefer zero-cost infrastructure and organic distribution. Do not add paid services unless the owner explicitly changes this constraint.
