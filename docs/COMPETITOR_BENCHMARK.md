# Cycle 2 Competitive Benchmark — Judging Phase

_Last updated: 2026-09-20._

## Purpose

This is an internal judge-style benchmark for MergeEarn. It is not an official Nimiq ranking and must not be presented as a prediction of the final winners.

The live Cycle 2 showcase contained **142 public entries** when screened on 2026-09-20.

## Current published scoring weights

The live Nimiq scoring guide uses 100 points:

- 45 — Functionality, reliability and usefulness
- 25 — Nimiq Pay and Nimiq integration
- 15 — Real usage
- 10 — Design and UX
- 5 — Builder promotion checklist

Source: https://miniappscompetition.com/scoring

The repository must optimize honestly for these criteria. Never fabricate users, wallets, transactions, GitHub activity, testimonials, metrics, or traffic.

## Provisional judge-style top group from public evidence

This is based on public submission pages, product stories, visible integration claims and available live proof. It is deliberately evidence-weighted rather than hype-weighted.

### 1. Nimgavel

Why it currently sets a high bar:
- clear real-world auction use case
- Nimiq Pay is used through the full lifecycle, not just checkout
- real-time multi-user interaction creates repeat value
- public submission reports real two-device mainnet auctions and multiple on-chain settlements
- the product story explains why signatures, balances and settlement matter

MergeEarn lesson:
- make real-world proof and multi-user evidence immediately visible to a judge
- remove every unnecessary step before the first proof interaction

### 2. Hunch

Why it is unusually strong:
- original product concept
- NIM is intrinsic to the experiment itself
- wallet signatures and real settlement are part of the trust model
- the loop is memorable and understandable: Decide → Predict → Wait → Reveal → Compare
- strong repeat/social value

MergeEarn lesson:
- the core loop must be memorable enough to repeat in one sentence
- proof should feel like the product, not documentation about the product

### 3. NimStall

Why it is strong:
- obvious real merchant need
- zero-hardware point-of-sale story is easy to understand
- transaction reference is embedded into on-chain payment data
- terminal verifies network consensus before confirming a sale
- strong practical Nimiq payment utility

MergeEarn lesson:
- keep the target user obvious within seconds
- surface independent verification as the main value proposition

## Other high-risk competitors

### Mimo
Strong social distribution, recurring participation, funded rewards and server-verified results.

### Ralli
Excellent organic invitation loop and repeat participation; NIM sits underneath a social experience.

### KashLink
Very strong simplicity and sharing: sending NIM becomes link-native instead of address-native.

### Rewind
Strong post-purchase NIM use case with payment/refund verification and a low-cost self-contained demo.

### NIMIQ.kids
Very clear audience, repeated household use and real-world testing story.

### Acta
Deep proof-of-action concept with multiple verification/oracle modes and on-chain receipts.

## MergeEarn judge position

MergeEarn's strongest differentiator is still:

**GitHub proves the work. Nimiq proves the money.**

Compared with direct bounty competitors such as Get Ransom, BountyBoard and Agora, MergeEarn has a more rigorous verification story:

- canonical GitHub repository / issue / pull request checks
- expected base branch verification
- merge-state verification
- server-side Nimiq funding verification
- server-side Nimiq payout verification
- explicit maintainer approval
- public no-login proof

## Current gap to the top group

The engineering core is competitive. The main remaining risks are:

1. **Real usage depth** — judges can only award what is genuinely demonstrated.
2. **First-60-second comprehension** — proof must be visible before authentication.
3. **Distribution** — every public bounty and sponsor opportunity must be shareable.
4. **Fresh multi-user evidence** — repeat sponsor → contributor → merge → payout lifecycles strengthen usefulness and reliability simultaneously.
5. **Negative-path evidence** — wrong repo/base, unmerged PR, unauthorized payout and invalid payment paths should remain demonstrably blocked.

## Current optimization order

### P0 — Judge proof in under 60 seconds
- primary landing CTA opens real proof, not authentication
- public bounty board remains no-login
- public live metrics remain visible
- GitHub issue/PR and confirmed Nimiq links remain first-class

### P0 — Genuine user growth
- sponsor opportunities are deep-linkable and shareable
- fresh contributor-friendly issues remain available
- never simulate wallets, contributors or transactions

### P0 — Reliability
- keep CI green
- keep production smoke monitoring active
- keep payment and GitHub trust boundaries unchanged

### P1 — Organic distribution
- canonical social metadata
- native Web Share
- sponsor deep links
- GitHub good-first-issue funnel
- public demo + source + proof

### P1 — Negative-path assurance
- record dedicated failure-path evidence where safe and feasible
- never mark a failure path as tested unless actually executed

## Cost rule

Prefer zero-cost infrastructure and organic distribution. Do not add paid services unless the owner explicitly changes this constraint.
